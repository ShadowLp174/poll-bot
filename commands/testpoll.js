const { SlashCommandBuilder } = require('@discordjs/builders');
const Canvas = require('canvas');
const { MessageAttachment, MessageActionRow, MessageButton } = require("discord.js");
const Poll = require("../Poll.js");
const dayjs = require('dayjs');
dayjs().format();

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

async function drawFooter(ctx, x, y, width, height, padding, users, voteCount, date) {
	ctx.save();
	ctx.translate(x, y);

	var rad = 15;

	ctx.fillStyle = "#4E535A"; //"#2C2F33";
	ctx.lineWidth = 2;
	ctx.strokeStyle = "#2C2F33";
	ctx.beginPath();
	ctx.moveTo(0 - padding, 0);
	ctx.lineTo(width, 0);
	ctx.stroke();

	let votes = `${voteCount} votes`;
	let metrics = ctx.measureText(votes);
	let h = textHeight(votes, ctx, metrics);

	ctx.fillText(votes, 5, rad + h);

	// Avatars
	var pos = rad * 3 + metrics.width;
	var yPos = 10;
	users.reverse();
	for (let i = 0; i < users.length; i++) {
		ctx.beginPath();
		let user = users[i]; // user == interaction.user.displayAvatarURL({ format: 'png' })

		const a = Canvas.createCanvas(rad * 2, rad * 2);
		const context = a.getContext("2d");

		context.beginPath();
		context.arc(rad, rad, rad, 0, Math.PI * 2, true);
		context.closePath();
		context.clip();

		const avatar = await Canvas.loadImage(user);
		context.drawImage(avatar, 0, 0, rad * 2, rad * 2);

		ctx.drawImage(a, pos, yPos);

		ctx.closePath();
		pos -= rad;
	}

	// Date
	date = dayjs(new Date()).format("DD.MM.YYYY HH:mm");
	metrics = ctx.measureText(date);
	h = textHeight(date, ctx, metrics);
	ctx.fillText(date, width - 15 - metrics.width, rad + h);
	ctx.restore();
}

async function testpoll(interaction) {
	var width = 500, height = 200, padding = 10;
	const canvas = Canvas.createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	var name = "poll";
	var nameHeight = textHeight(name, ctx);

	var description = "This is an example poll.";
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

	var votes = [3, 2]; // [optionA, optionB]
	var names = ["Poll Answer A", "Poll Answer B"];

	drawVoteBars(ctx, dataWidth - 20, barHeight, votes, {pad: padding, hHeight: headerHeight}, names);

	await drawFooter(ctx, padding, padding + headerHeight + barHeight * 2 + 20, width, height, padding, [interaction.user.displayAvatarURL({ format: 'png' }), interaction.user.displayAvatarURL({ format: 'png' }), interaction.user.displayAvatarURL({ format: 'png' })], votes.reduce((prev, curr) => prev+curr), new Date());

	const attachment = new MessageAttachment(canvas.toBuffer(), 'examplepoll.png');
	const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId('vOption1<PollIDHere>')
					.setLabel('Poll Answer A')
					.setStyle('PRIMARY'),
				new MessageButton()
					.setCustomId('vOption2<PollIDHere>')
					.setLabel('Poll Answer B')
					.setStyle('PRIMARY')
			);
	interaction.reply({ content: 'Here\'s an example: ', files: [attachment], components: [row] });

	const filter = i => i.customId === 'vOption1<PollIDHere>' || i.customId === 'vOption2<PollIDHere>';
	const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });
	collector.on('collect', async i => {
		if (i.customId === 'vOption1<PollIDHere>') {
			await i.reply({ content: 'You voted for the first option!', ephemeral: true });
		} else if (i.customId === 'vOption2<PollIDHere>') {
			await i.reply({ content: 'You voted for the second option!', ephemeral: true });
		}
	});

	collector.on('end', (collected) => {

	});
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('testpoll')
		.setDescription('Creates a Discord test poll'),
	async execute(interaction) {
		await testpoll(interaction);
	},
};
