const { MessageAttachment, MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");
const { SlashCommandBuilder } = require('@discordjs/builders');
const Poll = require("../Poll.js");

async function help(interaction, client) {
  const helpEmbed = new MessageEmbed()
    .setColor("#349D43")
    .setTitle("Discord Poll Bot")
    .setThumbnail(client.user.avatarURL())
    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL(), url: 'https://shadowlp174.4lima.de' })
    .setDescription("This bot was made to create more reliable Discord Polls based on u/Feeeeddmmmeee's concept art.")
    .addFields(
      //{ name: '\u200B', value: '\u200B' },
      { name: 'Help', value: '\u200B' },
      { name: '/poll prepare <option1> <option2>', value: 'Use this command to prepare the 2 options of the poll. Use this command before you start a poll!', inline: true },
      { name: '/poll start <name> <description> <duration>', value: 'This command will start the poll. The name is the word/text that\'s drawn in the top left corner. The description can be used for the question and the duration sets the time length of the poll in seconds. Max value is 300(5 min)', inline: true }
    )
    .setTimestamp()
    .setFooter(`Requested by ${interaction.user.tag}`, interaction.user.avatarURL());

  interaction.reply({ embeds: [helpEmbed], ephemeral: true })
}

var users = [];
var timer = {}, remainingDuration = {}, intervals = {};
var pollMessage = {};
var pollInteractions = [];
var endedChannels = [];
const polls = new Map();

const endedPolls = [];

var prepared = ["First Option", "Second Option"];

async function listenForStats(channel, id) {
  if (endedChannels.includes(channel.id)) return;
  endedChannels.push(channel.id);
  const filter = i => i.customId.startsWith("personalResult");
  const collector = channel.createMessageComponentCollector({ filter, time: 600000 });//time: 300000 });
  collector.on("collect", async i => {
    if (!i.isButton()) return;
    const uuid = i.customId.substring(i.customId.indexOf("<") + 1, i.customId.length - 1);
    if (endedPolls.includes(uuid)) {
      const poll = polls.get(uuid);
      await poll.personalStats(i.user.id);
      const attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');
      i.reply({ content: "Your votes: ", ephemeral: true, files: [attachment] });
    } else {
      i.reply({ content: "Unknown poll.", ephemeral: true });
    }
  });

  collector.on("end", async collected => {
    /*if (!polls.has(id)) return;
    const poll = polls.get(id);
    await poll.update();
    const attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');
    message.edit({ content: 'Here\'s the poll: ', files: [attachment], components: [] });*/
    if (collected.size > 0) {
      collected.forEach(async (item, key) => {
        const uuid = item.customId.substring(item.customId.indexOf("<") + 1, item.customId.length - 1);
        if (!polls.has(uuid)) return;
        const poll = polls.get(uuid);
        await poll.update();
        const attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');
        item.message.edit({ content: 'Here\'s the poll: ', files: [attachment], components: [] });
        polls.delete(uuid);
      });
    }
    console.log(`Collect ${collected.size} items`);
  });
}

async function addPoll(interaction, client) {
  const options = interaction.options;
  if (options.data.length == 0) {
    await help(interaction, client);
  } else {
    switch (options.getSubcommand()) {
      case 'help': help(interaction, client); break;
      case 'prepare':
        await interaction.editReply();
        if (options.get("option1").value && options.get("option2").value) {
          prepared = [options.get("option1").value, options.get("option2").value];

          interaction.editReply({ content: "Prepared the next poll. Ready to start", ephemeral: true });
        } else {
          interaction.editReply({ content: "Something went wrong :(", ephemeral: true });
        }
        break;
      case 'start':
        if (options.get("name") && options.get("description")) {
          var duration = 30 * 1000;
          if (options.get("duration").value) {
            if (options.get("duration").value < 60 * 60 * 1000) {
                duration = options.get("duration").value * 1000;
            }
          }
          await interaction.deferReply();

          const uuid = (new Date()).getTime().toString(16) + Math.random().toString(16).slice(2);

          var names = prepared;

          var name = options.get("name").value, description = options.get("description").value;
          //poll = new Poll({name: name, description: description}, {name: names})
          polls.set(uuid, new Poll({name: name, description: description}, {name: names}));
          const poll = polls.get(uuid);
          await poll.update();

          const attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');
          const row = new MessageActionRow()
              .addComponents(
                new MessageButton()
                  .setCustomId('vOption1<' + uuid + '>')
                  .setLabel(names[0])
                  .setStyle('PRIMARY'),
                new MessageButton()
                  .setCustomId('vOption2<' + uuid + '>')
                  .setLabel(names[1])
                  .setStyle('PRIMARY')
              );

          await interaction.editReply({ content: 'Here\'s the poll: ', files: [attachment], components: [row] }).then(msg => {
            pollMessage[uuid] = msg;
          });
          const channel = client.channels.cache.get(interaction.channel.id);
          let time = parseInt(new Date().getTime() / 1000) + parseInt(duration / 1000);
          channel.send('Poll ends: <t:' + time + ":D><t:" + time + ":T>").then((msg) => {
            timer[uuid] = msg;

            const filter = i => i.customId === 'vOption1<' + uuid + '>' || i.customId === 'vOption2<' + uuid + '>';
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: duration });

            users[uuid] = [];

            collector.on('collect', async i => {
              pollMessage[uuid] = i.message;
              if (users[uuid].includes(i.user.id)) {
                await i.reply({ content: 'You\'ve voted already!', ephemeral: true} );
              } else {
                await i.deferUpdate();
                await i.message.removeAttachments();
                //pollInteractions.push(i);
                if (i.customId === 'vOption1<' + uuid + '>') {
                  users[uuid].push(i.user.id);
                  await poll.addVote(0, i.user.id, i.user.displayAvatarURL({ format: 'png' }));
                  let attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');

                  await i.editReply({ content: 'Here\'s the poll: ', files: [attachment] });
                  await i.followUp({ content: 'You voted for Option A.', ephemeral: true });
                } else if (i.customId === 'vOption2<' + uuid + '>') {
                  users[uuid].push(i.user.id);
                  await poll.addVote(1, i.user.id, i.user.displayAvatarURL({ format: 'png' }));
                  let attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');

                  await i.editReply({ content: 'Here\'s the poll: ', files: [attachment] });
                  await i.followUp({ content: 'You voted for Option B.', ephemeral: true });
                }
              }
            });

            collector.on('end', async collected => {
              console.log(collected.entries());
              //let channel = await client.channels.fetch(collected.entries().next().value[1].channelId)
              timer[uuid].edit("Ended");
              console.log(uuid);

              let attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');
              let row = new MessageActionRow()
                  .addComponents(
                    new MessageButton()
                      .setCustomId('personalResult<' + uuid + '>')
                      .setLabel('What did I vote for?')
                      .setStyle('PRIMARY'));
              await timer[uuid].channel.send({ content: "That's the final result: ", files: [attachment], components: [row] });/*.then(msg => {
                listenForStats(msg);
              });*/
              listenForStats(channel);
              if (pollMessage[uuid]) pollMessage[uuid].edit({ content: 'Here\'s the poll: ', files: [attachment], components: [] });
              timer[uuid].channel.send("Total Answers: " + poll.votes.reduce((prev, curr) => prev + curr));
              delete users[uuid]; delete pollMessage[uuid];
              endedPolls.push(uuid);
            });
          });
        }
        break;
    }
  }
}

const data = new SlashCommandBuilder();
data.setName('poll');
data.setDescription('Discord Poll Bot Commands. Send without subcommand for help.');
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
data.addSubcommand(subcommand =>
  subcommand.setName('help')
    .setDescription('Displays the help embed and info about the bot.'));
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
