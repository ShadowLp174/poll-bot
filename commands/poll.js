const { MessageAttachment, MessageActionRow, MessageButton } = require("discord.js");
const { SlashCommandBuilder } = require('@discordjs/builders');
const Poll = require("../Poll.js");

var users = [];
var timer, remainingDuration = 0, interval;
var pollMessage;

var prepared = ["First Option", "Second Option"];

async function addPoll(interaction, client) {
  const options = interaction.options;
  switch (options.getSubcommand()) {
    case 'prepare':
      if (options.get("option1").value && options.get("option2").value) {
        prepared = [options.get("option1").value, options.get("option2").value];

        interaction.reply({ content: "Prepared the next poll. Ready to start", ephemeral: true });
      } else {
        interaction.reply({ content: "Something went wrong :(", ephemeral: true });
      }
      break;
    case 'start':
      if (options.get("name") && options.get("description")) {
        var duration = 30 * 1000;
        if (options.get("duration").value) {
          if (options.get("duration").value < 5 * 60 * 1000) {
              duration = options.get("duration").value * 1000;
          }
        }

        var names = prepared;

        var name = options.get("name").value, description = options.get("description").value;
        var poll = new Poll({name: name, description: description}, {name: names});

        const attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');
      	const row = new MessageActionRow()
      			.addComponents(
      				new MessageButton()
      					.setCustomId('vOption1<PollIDHere>')
      					//.setLabel('Option A')
                .setLabel(names[0])
      					.setStyle('PRIMARY'),
      				new MessageButton()
      					.setCustomId('vOption2<PollIDHere>')
      					//.setLabel('Option B')
                .setLabel(names[1])
      					.setStyle('PRIMARY')
      			);

        await interaction.reply({ content: 'Here\'s the poll: ', files: [attachment], components: [row] });
        const channel = client.channels.cache.get(interaction.channel.id);
        channel.send('Remaining time: ' + duration / 1000).then((msg) => {
          timer = msg;
        });

        remainingDuration = duration;

        interval = setInterval(() => {
          if (remainingDuration >= 0) {
            timer.edit("Remaining time: " + remainingDuration / 1000 + "s");
            remainingDuration -= 1000;
          } else {
            timer.edit("Ended");
            clearInterval(interval);
          }
        }, 1000);

        const filter = i => i.customId === 'vOption1<PollIDHere>' || i.customId === 'vOption2<PollIDHere>';
      	const collector = interaction.channel.createMessageComponentCollector({ filter, time: duration });

        collector.on('collect', async i => {
          //await i.deferReply();
          pollMessage = i.message;
          if (users.includes(i.user.id)) {
            await i.reply({ content: 'You voted already!', ephemeral: true} );
          } else {
            await i.message.removeAttachments();
            if (i.customId === 'vOption1<PollIDHere>') {
              users.push(i.user.id);
              poll.addVote(0);
              let attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');

              await i.update({ content: 'Here\'s the poll: ', files: [attachment] });
              //await i.reply({ content: 'You voted for Option A.', ephemeral: true });
        		} else if (i.customId === 'vOption2<PollIDHere>') {
              users.push(i.user.id);
              poll.addVote(1);
              let attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');

              await i.update({ content: 'Here\'s the poll: ', files: [attachment] });
              //await i.reply({ content: 'You voted for Option B.', ephemeral: true });
        		}
          }
      	});

      	collector.on('end', async collected => {
          timer.edit("Ended");
          //pollMessage.delete();

          let attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');
          await timer.channel.send({ content: "That's the final result: ", files: [attachment] });
          timer.channel.send("Total Answers: " + collected.size);
        });
      }
      break;
  }
}

const data = new SlashCommandBuilder();
data.setName('poll');
data.setDescription('Create/Moderate Polls');
data.addSubcommand(subcommand =>
  subcommand.setName('prepare')
    .setDescription('Set detailed data about the next poll')
    .addStringOption(option =>
      option.setName("option1")
        .setDescription("The name of the first answer option")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("option2")
        .setDescription("The name of the second answer option")
        .setRequired(true)));
data.addSubcommand(subcommand =>
  subcommand.setName('start')
    .setDescription('Starts the poll')
    .addStringOption(option =>
      option.setName("name")
      .setDescription('The Name of the Poll')
      .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
      .setDescription('The Description/Question of the Poll')
      .setRequired(true))
    .addIntegerOption(option =>
      option.setName("duration")
      .setDescription("The duration if the Poll in seconds")
      .setRequired(true)));
/*data.addStringOption(option =>
  option.setName('name')
    .setDescription('The Name of the Poll')
    .setRequired(true));
data.addStringOption(option =>
  option.setName('description')
    .setDescription('The Description/Question of the Poll')
    .setRequired(true));
data.addIntegerOption(option =>
  option.setName('duration')
    .setDescription('The Duration of the Poll in seconds')
    .setRequired(true));
data.addStringOption(option =>
  option.setName('firstOption')
    .setDescription('The name of the first answer option')
    .setRequired(true));
data.addStringOption(option =>
  option.setName('secondOption')
    .setDescription('The name of the second answer option')
    .setRequired(true));*/

module.exports = {
  data: data,
  async execute(interaction, client) {
		await addPoll(interaction, client);
	},
}
