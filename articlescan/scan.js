//news api key 
//6817073ad96f45f38cd040668307c709

var debug = true
/*




	rsync -avzh --exclude 'images' --exclude 'mobileimages' dist/ 45.76.74.30:/home/v/projects/agg/dist/
	rsync -azvh src/ 45.76.74.30:/home/v/projects/agg/src/
	

  security sweep
    DB level
    front end level
    express level
  [add index to URL column]

  user preferences & registration.
  prevent account spam (captcha or whatever)
  prune old accounts?

extras:
  make bundle.js smaller
*/


// var Nightmare = require('nightmare')



var fs = require('fs')
const Path = require('path')
const NewsAPI = require('newsapi');
const newsapi = new NewsAPI('');
const Axios = require('axios')
const sharp = require('sharp')
var { promisify } = require('util');
var sizeOf = promisify(require('image-size'))
const uuidv1 = require('uuid/v1');


const { Client } = require('pg')

const client = new Client({
	user: '',
	host: 'localhost',
	database: '',
	password: '',
	port: 5432,
})








function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
	var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
	return { width: srcWidth * ratio, height: srcHeight * ratio };
}


async function resizeImage(path) {
	try {
		var fullPath = Path.resolve(__dirname + '/../../dist/images/' + path)
		if (debug) { console.log("resize img " + path) }
		var dimensions = await sizeOf(fullPath)
		var width = dimensions.width
		var height = dimensions.height

		const maxWidth = 400
		const maxHeight = 400
		var obj = calculateAspectRatioFit(width, height, maxWidth, maxHeight)

		const readStream = fs.createReadStream(fullPath)
		const w = Math.round(obj.width)
		const h = Math.round(obj.height)

		var imageType = path.split(".")[1]
		var newName = uuidv1() + "." + imageType
		var newPath = Path.resolve(__dirname + '/../../dist/images/' + newName)
		const writeStream = fs.createWriteStream(newPath)
		const pipeline = sharp()
		pipeline
			.resize(w, h)
			.pipe(writeStream)


		readStream.pipe(pipeline)
		return new Promise((resolve, reject) => {
			writeStream.on('finish', () => { resolve(newName) })
			writeStream.on('error', () => { console.log("resize failure " + path + " " + newPath); reject("") })
		})
	} catch (e) {
		console.log("resize error")
		return ""

	}
}



async function downloadImage(imgUrl) {
	try {

		if (debug) { console.log("download image: " + imgUrl) }
		const response = await Axios({

			method: 'GET',
			"url": imgUrl,
			responseType: 'stream'
		}).catch(() => { console.log("error dl " + imgUrl) })


		var imageType = response.headers["content-type"].split("/")[1]
		var name = uuidv1() + "." + imageType
		var path = Path.resolve(__dirname + '/../../dist/images/' + name)
		response.data.pipe(fs.createWriteStream(path))

		return new Promise((resolve, reject) => {
			response.data.on('end', () => {
				resolve(name)
			})
			response.data.on('error', () => { console.log("image dl failure:" + imgUrl); console.log(response.status); reject("") })

		})
	}
	catch (e) { console.log(e); return "" }
}





async function articles(topStory, response, category) {
	for (var i = 0; i < response["articles"].length; i++) {
		var article = response["articles"][i]
		var url = article["url"]

		var query = {
			text: "select exists(select 1 from article where url=$1)",
			values: [url],
		}

		var res = await client.query(query)
		var newEntry = (res.rows[0].exists == false)
		if (!newEntry) { continue }

		var sourceName = article["source"]["id"]

		if (!sourceName) {
			sourceName = article["source"]["name"]
		}

		var query = {
			text: "select exists(select 1 from source where sourcename=$1)",
			values: [sourceName],
		}
		var res = await client.query(query)
		var newEntry = (res.rows[0].exists == false)


		if (newEntry && sourceName) {
			var country = (topStory ? 'us' : '')
			var query = {
				text: "INSERT INTO source(sourcename, language, country) VALUES ($1,$2,$3)",
				values: [sourceName, 'en', country]
			}
			await client.query(query)
		}

		var author = article["author"]
		var title = article["title"]
		var imageUrl = article["urlToImage"]
		var articleTimestamp = article["publishedAt"]

		await delay()
		var imageFilename = ""
		if (imageUrl) {
			imageFilename = await getImagePath(imageUrl)
		}

		var sourceId = ""
		var query = {
			text: "select id from source where sourcename = $1",
			values: [sourceName],
		}
		var res = await client.query(query)
		var sourceId = res.rows[0].id

		var summary = ""

		var query = {
			text: "INSERT INTO article(topstory, sourceid, author, title, url, summary, imagefilename, articletimestamp, category) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
			values: [topStory, sourceId, author, title, url, summary, imageFilename, articleTimestamp, category],
		}
		await client.query(query)
	}

}

function delay() {
	return new Promise(resolve => setTimeout(resolve, 1000))
}

async function getImagePath(imgUrl) {
	if (imgUrl.trim() == "") { return "none" }
	var pathName = await downloadImage(imgUrl)
	if (pathName == "") { return "" }
	var newName = await resizeImage(pathName)
	if (newName != pathName) {
		var oldFullPath = Path.resolve(__dirname + '/../../dist/images/' + pathName)
		fs.unlink(oldFullPath, () => { })
		convertToMobile(newName)

	}
	return newName
}




client.connect()
processBatch()






// var content = fs.readFileSync('art.json')
// var obj = JSON.parse(content)
// var response = "dummy"

async function processBatch() {
	categories = ["sports", "entertainment", "health", "science", "business", "technology", "general"]

	for (var i = 0; i < categories.length; i++) {
		var response = await getHeadlines(categories[i])
		if (response != "") {
			var topStory = true
			await articles(topStory, response, categories[i])
		}
	}


	// var response = await getEverything()
	// if (response != "") {
	// 	var topStory = false
	// 	await articles(topStory, response, "")
	// }

	await client.end()

}




async function getHeadlines(category) {
	var response = await newsapi.v2.topHeadlines({
		country: 'us',
		language: 'en',
		pageSize: 100,
		'category': category
	})
	if (response['status'] == 'ok') {
		// await fs.writeFile("art.json", JSON.stringify(response), () => { process.exit(0) })
		return response
	}
	else {
		return ""
	}
}

async function getEverything() {
	const sourceList = 'associated-press,business-insider,cnn,fox-news,usa-today,reuters,google-news,the-new-york-times,the-huffington-post,nbc-news,daily-mail,the-washington-post,bbc-news,abc-news,the-wall-street-journal'
	var response = await newsapi.v2.everything({
		sources: sourceList,
		language: 'en',
		pageSize: 100
	})
	if (response['status'] == 'ok') {
		// await fs.writeFile("art.json", JSON.stringify(response), () => { process.exit(0) })
		return response
	}
	else {
		return ""
	}
}


async function convertToMobile(name){
	try {
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
	catch (e) { console.log(e) }
}




