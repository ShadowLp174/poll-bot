const { SlashCommandBuilder } = require('@discordjs/builders');
const Canvas = require('canvas');
const { MessageAttachment, MessageActionRow, MessageButton } = require("discord.js");
const Poll = require("../Poll.js");

function textHeight(text, ctx, m) {
	let metrics = m || ctx.measureText(text);
	return metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) { // thx to https://stackoverflow.com/users/227299/juan-mendes
  if (typeof stroke === 'undefined') {
    stroke = true;
  }
  if (typeof radius === 'undefined') {
    radius = 5;
  }
  if (typeof radius === 'number') {
    radius = {tl: radius, tr: radius, br: radius, bl: radius};
  } else {
    var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

function drawVoteBars(ctx, width, height, votes, vars, names) {
	let padding = vars.pad;
	let headerHeight = vars.hHeight;
	let sum = votes.reduce((prev, curr) => prev + curr);
	let percentages = votes.map((v) => Math.floor(v / (sum / 100) * 10) / 10);
	ctx.save();
	ctx.translate(padding, padding + headerHeight);

	var barPadding = 5;
	percentages.forEach((percentage, i) => { // I don't know I meant to do with this calculations but it somehow works so don't touch it
		ctx.fillStyle = "#2C2F33";
		let y = (height + 10 ) * i;
		roundRect(ctx, 20, y, width, height, 5, true, false); // full bar

		ctx.fillStyle = "#5865F2"; // percentage display
		roundRect(ctx, 20, y, width * (votes[i] / (sum / 100) / 100), height, 5, true, false);

		ctx.fillStyle = "#2C2F33";
		let h = textHeight(i + 1, ctx);
		ctx.fillText(i + 1, 0, y + height / 2 + h / 2);

		ctx.fillStyle = "#FFFFFF"; // Option names
		h = textHeight(names[i], ctx);
		ctx.fillText(names[i], 30, y + 10 + h);

		ctx.fillStyle = "#2C2F33"; // percentage and vote count background
		let metrics = ctx.measureText(percentage + "% (" + votes[i] + ")");
		let w = metrics.width;
		h = textHeight(percentage + "% (" + votes[i] + ")", ctx, metrics);
		y = y + (height - h - barPadding * 2) + barPadding * 2;
		roundRect(ctx, width - barPadding - w, y - h, w, h + 4, 5, true, false);

		ctx.fillStyle = "#5865F2"; // percentage and vote count
		ctx.fillText(percentage + "% (" + votes[i] + ")", width - barPadding - w, y);
	});

	ctx.restore();
}

function drawFooter(ctx, x, y, width, height, padding) {
	ctx.save();
	ctx.translate(x, y);

	console.log(y);

	ctx.fillStyle = "#2C2F33";
	ctx.lineWidth = 2;
	ctx.strokeStyle = "#2C2F33";
	ctx.beginPath();
	ctx.moveTo(x - padding, y);
	ctx.lineTo(width, y);
	ctx.stroke();

	ctx.restore();
}

function testpoll(interaction) {
	var width = 500, height = 250, padding = 10;
	const canvas = Canvas.createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	var name = "testpoll";
	var nameHeight = textHeight(name, ctx);

	var description = "This is a testpoll";
	var descHeight = textHeight(description, ctx);

	ctx.fillStyle = "#23272A";
	roundRect(ctx, 0, 0, width, height, 5, true, false); // background

	ctx.fillStyle = "#4E535A";
	ctx.fillText(name, padding, padding + nameHeight / 2); // name

	ctx.fillStyle = "#FFFFFF";
	ctx.font = "normal 17px sans-serif";
	ctx.fillText(description, padding, padding + 13 + nameHeight + descHeight / 2); // description

	var headerHeight = padding + descHeight + nameHeight + 13;
	var dataWidth = width - padding * 2;
	var dataHeight = height - headerHeight - 30;

	var barHeight = 40;

	var votes = [2, 4]; // [optionA, optionB]
	var names = ["Working!", "Not Working!"];

	drawVoteBars(ctx, dataWidth - 20, barHeight, votes, {pad: padding, hHeight: headerHeight}, names);

	drawFooter(ctx, dataWidth - 20, padding + headerHeight + barHeight * 2 + 30, width, height, padding);

	const attachment = new MessageAttachment(canvas.toBuffer(), 'testpoll.png');
	const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId('vOption1<PollIDHere>')
					.setLabel('Option A')
					.setStyle('PRIMARY'),
				new MessageButton()
					.setCustomId('vOption2<PollIDHere>')
					.setLabel('Option B')
					.setStyle('PRIMARY')
			);
	interaction.reply({ content: 'Here\'s the poll: ', files: [attachment], components: [row] });

	const filter = i => i.customId === 'vOption1<PollIDHere>' || i.customId === 'vOption2<PollIDHere>';
	const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

	/*///////////////////////////////

	NOTE:

	interaction.reply({ ephemeral: true });

	should make the message only visible to the user who interacted

	*/////////////////////////////////

	collector.on('collect', async i => {
		if (i.customId === 'vOption1<PollIDHere>') {
			await i.reply({ content: 'You voted for the first option!', ephemeral: true });
		} else if (i.customId === 'vOption2<PollIDHere>') {
			await i.reply({ content: 'You voted for the second option!', ephemeral: true });
		}
	});

	collector.on('end', collected => console.log(`Collected ${collected.size} items`));
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('testpoll')
		.setDescription('Creates a Discord test poll'),
	async execute(interaction) {
		await testpoll(interaction);
	},
};
