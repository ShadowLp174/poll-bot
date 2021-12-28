const Canvas = require('canvas');

/*
@param options {Object}; format: {name: ["aName", "anotherName"]}
@param name {Object}; format: {name: "PollName", description: "PollDescription"}
*/

class Poll {
	constructor(name, options) {
		this.voteOptions = options;
		this.votes = [0, 0];

		this.options = {
			name: name.name,
			description: name.description
		}
    this.update();
    return this;
	}

  textHeight(text, ctx, m) {
  	let metrics = m || ctx.measureText(text);
  	return metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  }

  roundRect(ctx, x, y, width, height, radius, fill, stroke) { // Credit to https://stackoverflow.com/users/227299/juan-mendes
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

  update() {
    let roundRect = this.roundRect;
    let textHeight = this.textHeight;

		var width = 500, height = 250, padding = 10;
    const canvas = Canvas.createCanvas(width, height);
		this.canvas = canvas;
		const ctx = this.canvas.getContext('2d');
		this.ctx = ctx;

		let name = this.options.name;
		var nameHeight = textHeight(name, ctx);

		let description = this.options.description;
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

		var votes = this.votes
		var names = this.voteOptions.name;

		this.drawVoteBars(ctx, dataWidth - 20, barHeight, votes, {pad: padding, hHeight: headerHeight}, names);
  }

  addVote(option) {
		this.votes[option]++;
    this.update();
		return this.canvas;
	}

	drawVoteBars(ctx, width, height, votes, vars, names) {
    let roundRect = this.roundRect;
    let textHeight = this.textHeight;
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
			roundRect(ctx, width - barPadding - w - 2, y - h - 2, w + 4, h + 7, 5, true, false);

			ctx.fillStyle = "#5865F2"; // percentage and vote count
			ctx.fillText(percentage + "% (" + votes[i] + ")", width - barPadding - w, y);
		});

		ctx.restore();
	}
}

module.exports = Poll;
