
var fs = require('fs')
const Path = require('path')
const sharp = require('sharp')
var { promisify } = require('util');
var sizeOf = promisify(require('image-size'))



mobileImages()


function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
	var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
	return { width: srcWidth * ratio, height: srcHeight * ratio };
}



async function mobileImages() {
	try {
		var folderPath = Path.resolve(__dirname + '/../../dist/images/')

		var files = fs.readdirSync(folderPath);

		for (var i = 0; i < files.length; i++) {
			var name = files[i]
			var filePath = Path.resolve(__dirname + '/../../dist/images/' + name)
			var newPath = Path.resolve(__dirname + '/../../dist/mobileimages/' + name)

			var dimensions = await sizeOf(filePath)
			var width = dimensions.width
			var height = dimensions.height

			const maxWidth = 200
			const maxHeight = 200
			var obj = calculateAspectRatioFit(width, height, maxWidth, maxHeight)
			const readStream = fs.createReadStream(filePath)
			const w = Math.round(obj.width)
			const h = Math.round(obj.height)


			const writeStream = fs.createWriteStream(newPath)
			const pipeline = sharp()
			pipeline
				.resize(w, h)
				.pipe(writeStream)


			readStream.pipe(pipeline)

		}


	}
	catch (e) { console.log(e) }

}
