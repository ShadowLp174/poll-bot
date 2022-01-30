const { MessageAttachment, MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");
const { SlashCommandBuilder } = require('@discordjs/builders');
const Poll = require("../Poll.js");

function DiscordPoll(c) {
  const client = c;
  var users = [];
  var timer, remainingDuration = 0, interval;
  var pollMessage;
  var pollInteractions = [];
  var poll;

  var prepared = ["First Option", "Second Option"];

  var UUID = new Date().getTime() + "" + client.uptime;

  var listenForStats = this.listenForStats = (channel) => {
    const filter = i => i.customId === `personalResult<${UUID}>`;
    const collector = channel.createMessageComponentCollector({ filter, time: 300000 });
    collector.on("collect", async i => {
      await poll.personalStats(i.user.id);
      const attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');
      i.reply({ content: "Your votes: ", ephemeral: true, files: [attachment] });
    });

    collector.on("end", async collected => {
      console.log(`Collect ${collected.size} items`);
    });
  }

  var preparePoll = this.preparePoll = async (ineraction) => {
    const options = interaction.options;
    if (options.get("option1").value && options.get("option2").value) {
      prepared = [options.get("option1").value, options.get("option2").value];

      interaction.reply({ content: "Prepared the next poll. Ready to start", ephemeral: true });
    } else {
      interaction.reply({ content: "Something went wrong :(", ephemeral: true });
    }
  }

  var start = this.start = async (interaction) => {
    const options = interaction.options;
    if (options.get("name") && options.get("description")) {
      var duration = 30 * 1000;
      if (options.get("duration").value) {
        if (options.get("duration").value < 5 * 60 * 1000) {
            duration = options.get("duration").value * 1000;
        }
      }

      var names = prepared;

      var name = options.get("name").value, description = options.get("description").value;
      poll = new Poll({name: name, description: description}, {name: names})
      await poll.update();

      const attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');
      const row = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId(`vOption1<${UUID}>`)
              .setLabel(names[0])
              .setStyle('PRIMARY'),
            new MessageButton()
              .setCustomId(`vOption2<${UUID}>`)
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

      const filter = i => i.customId === `vOption1<${UUID}>` || i.customId === `vOption2<${UUID}>`;
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: duration });

      collector.on('collect', async i => {
        console.log(i.customId);
        pollMessage = i.message;
        if (users.includes(i.user.id)) {
          await i.reply({ content: 'You\'ve voted already!', ephemeral: true} );
        } else {
          await i.deferUpdate();
          await i.message.removeAttachments();
          if (i.customId === `vOption1<${UUID}>`) {
            users.push(i.user.id);
            await poll.addVote(0, i.user.id, i.user.displayAvatarURL({ format: 'png' }));
            let attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');

            await i.editReply({ content: 'Here\'s the poll: ', files: [attachment] });
            await i.followUp({ content: 'You voted for Option A.', ephemeral: true });
          } else if (i.customId === `vOption2<${UUID}>`) {
            users.push(i.user.id);
            await poll.addVote(1, i.user.id, i.user.displayAvatarURL({ format: 'png' }));
            let attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');

            await i.editReply({ content: 'Here\'s the poll: ', files: [attachment] });
            await i.followUp({ content: 'You voted for Option B.', ephemeral: true });
          }
        }
      });

      collector.on('end', async collected => {
        let channel = await client.channels.fetch(collected.entries().next().value[1].channelId)
        clearInterval(interval);
        timer.edit("Ended");

        let attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');
        const row = new MessageActionRow()
            .addComponents(
              new MessageButton()
                .setCustomId(`personalResult<${UUID}>`)
                .setLabel('What did I vote for?')
                .setStyle('PRIMARY'));
        await timer.channel.send({ content: "That's the final result: ", files: [attachment], components: [row] });
        listenForStats(channel);
        pollMessage.edit({ content: 'Here\'s the poll: ', files: [attachment], components: [] });
        timer.channel.send("Total Answers: " + poll.votes.reduce((prev, curr) => prev + curr));
        users = [], pollMessage = undefined;
      });
    }
  }
  return this;
}

async function help(interaction, client) {
  const helpEmbed = new MessageEmbed()
    .setColor("#349D43")
    .setTitle("Discord Poll Bot")
    .setThumbnail(client.user.avatarURL())
    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL(), url: 'https://shadowlp174.4lima.de' })
    .setDescription("This bot was made to creat better Discord Polls based on u/Feeeeddmmmeee's concept art.")
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

/*var users = [];
var timer, remainingDuration = 0, interval;
var pollMessage;
var pollInteractions = [];
var poll;

var prepared = ["First Option", "Second Option"];

function listenForStats(channel) {
  const filter = i => i.customId === 'personalResult<PollIdHere>';
  const collector = channel.createMessageComponentCollector({ filter, time: 300000 });
  collector.on("collect", async i => {
    await poll.personalStats(i.user.id);
    const attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');
    i.reply({ content: "Your votes: ", ephemeral: true, files: [attachment] });
  });

  collector.on("end", async collected => {
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
          poll = new Poll({name: name, description: description}, {name: names})
          await poll.update();

          const attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');
          const row = new MessageActionRow()
              .addComponents(
                new MessageButton()
                  .setCustomId('vOption1<PollIDHere>')
                  .setLabel(names[0])
                  .setStyle('PRIMARY'),
                new MessageButton()
                  .setCustomId('vOption2<PollIDHere>')
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
            pollMessage = i.message;
            if (users.includes(i.user.id)) {
              await i.reply({ content: 'You\'ve voted already!', ephemeral: true} );
            } else {
              await i.deferUpdate();
              await i.message.removeAttachments();
              //pollInteractions.push(i);
              if (i.customId === 'vOption1<PollIDHere>') {
                users.push(i.user.id);
                await poll.addVote(0, i.user.id, i.user.displayAvatarURL({ format: 'png' }));
                let attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');

                await i.editReply({ content: 'Here\'s the poll: ', files: [attachment] });
                await i.followUp({ content: 'You voted for Option A.', ephemeral: true });
              } else if (i.customId === 'vOption2<PollIDHere>') {
                users.push(i.user.id);
                await poll.addVote(1, i.user.id, i.user.displayAvatarURL({ format: 'png' }));
                let attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');

                await i.editReply({ content: 'Here\'s the poll: ', files: [attachment] });
                await i.followUp({ content: 'You voted for Option B.', ephemeral: true });
              }
            }
          });

          collector.on('end', async collected => {
            let channel = await client.channels.fetch(collected.entries().next().value[1].channelId)
            clearInterval(interval);
            timer.edit("Ended");

            let attachment = new MessageAttachment(poll.canvas.toBuffer(), 'poll.png');
            const row = new MessageActionRow()
                .addComponents(
                  new MessageButton()
                    .setCustomId('personalResult<PollIdHere>')
                    .setLabel('What did I vote for?')
                    .setStyle('PRIMARY'));
            await timer.channel.send({ content: "That's the final result: ", files: [attachment], components: [row] });
            listenForStats(channel);
            pollMessage.edit({ content: 'Here\'s the poll: ', files: [attachment], components: [] });
            timer.channel.send("Total Answers: " + poll.votes.reduce((prev, curr) => prev + curr));
            users = [], pollMessage = undefined;
          });
        }
        break;
    }
  }
}*/

var dcPolls = new Map();
var polls = [];

async function addPoll(interaction, client) {
  const options = interaction.options;
  if (options.data.length == 0) {
    await help(interaction, client);
  } else {
    switch (options.getSubcommand()) {
      case 'help': help(interaction, client); break;
      case 'prepare':
        var dcp = new DiscordPoll(client);
        dcPolls.set(interaction.user.id, dcp);
        dcp.preparePoll(interaction);
      break;
      case 'start':
        if (dcPolls.get(interaction.user.id)) {
          var dcp = dcPolls.get(interaction.user.id);
          await dcp.start(interaction);
        } else {
          var dcp = new DiscordPoll(client);
          await dcp.start(interaction);
          polls.push(dcp);
        }
      break;
    }
  }
}

const data = new SlashCommandBuilder();
data.setName('experimental-poll');
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

module.exports = {
  data: data,
  async execute(interaction, client) {
		await addPoll(interaction, client);
	},
}
