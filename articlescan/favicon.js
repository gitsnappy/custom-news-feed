var fs = require('fs')
var { promisify } = require('util');
var sizeOf = promisify(require('image-size'))
const uuidv1 = require('uuid/v1');
const sharp = require('sharp')
var myURL = require('url-parse');
const Axios = require('axios')
const Path = require('path')
const { Client } = require('pg')
const client = new Client({
	user: 'ascanner',
	host: '',
	database: '',
	password: '',
	port: 5432,
})

getMissing()
async function getMissing() {
	await client.connect()
	var fn = 'badfile.txt'
	var badList = []

	if (fs.existsSync(fn)) {
		var data = fs.readFileSync('badfile.txt')
		badList = JSON.parse(data)
	}



	var miss = await missingFavicons()
	for (var i = 0; i < miss.length; i++) {
		// for (var i = 200; i < 200; i++) {
		// console.log(miss[i])
		// console.log(i + miss[i].source)
		if (badList.includes( miss[i].source )){continue} //skip bad ones
		var val = await getFavicon(miss[i].url, miss[i].source)
		if (val) {
			badList.push(val)
		}
	}


	fs.writeFileSync(fn, JSON.stringify(badList))


}
function delay() {
	return new Promise(resolve => setTimeout(resolve, 1000))
}

async function missingFavicons() {


	var query = {
		text: `select distinct on (s.sourcename) sourcename, a.url   from source s, article a 
  where a.sourceid= s.id
  order by s.sourcename desc`
	}
	var missing = []

	var res = await client.query(query)
	for (var i = 0; i < res.rows.length; i++) {
		var source = res.rows[i].sourcename
		var url = res.rows[i].url
		var exPath = Path.resolve(__dirname + '/../../dist/assets/' + source + '.png')
		var exists = fs.existsSync(exPath)
		// console.log(source + exPath + exists)
		if (!exists) {
			missing.push({ source, url })
			// console.log(source)
		}
	}

	try {
		await client.end()
	}
	catch (e) { }//ignore because library throws error on close

	return missing
}



async function checkConvertPngRename(relPath, sourceName) {
	try {
		if (!relPath || !sourceName) { console.log("bad relpath"); return "" }

		var imageType = relPath.split(".")[1]
		var fullPath = Path.resolve(__dirname + '/../../dist/assets/' + relPath)
		var newFullPath = Path.resolve(__dirname + '/../../dist/assets/' + sourceName + '.png')
		console.log("nfp" + newFullPath)

		var okayTypes = ['jpg', 'jpeg']
		if (imageType != "png" && okayTypes.indexOf(imageType) > -1) {
			console.log("type" + imageType)
			const readStream = fs.createReadStream(fullPath)
			const writeStream = fs.createWriteStream(newFullPath)
			const pipeline = sharp()
			pipeline
				.png()
				.pipe(writeStream)

			readStream.pipe(pipeline)
			return new Promise((resolve, reject) => {
				writeStream.on('finish', () => { fs.unlink(fullPath, () => { }); resolve(newFullPath) })
				writeStream.on('error', () => { console.log("convert png failure " + fullPath + " " + newFullPath); reject("") })
			})
		}
		else if (imageType != 'png') {
			console.log("not png or jpg")
			return ""
		}
		await fs.rename(fullPath, newFullPath, () => { })
		return newFullPath
	}
	catch (e) { console.log(e); return "" }
}

async function getFavicon(url, sourceName) {
	var exPath = Path.resolve(__dirname + '/../../dist/assets/' + sourceName + '.png')
	var exists = fs.existsSync(exPath)

	if (exists) {
		if (debug) { console.log("already exists:, no dl favic" + url) }
		return ""
	}

	var domain = new myURL(url).hostname
	var imgUrl = `http://favicongrabber.com/api/grab/${domain}?pretty=true`

	await delay()
	try {
		var err = false
		const response = await Axios({
			method: 'GET',
			"url": imgUrl
		})
			.catch(() => { err = true; console.log("error dl " + imgUrl); })
		if (err) { return "" }
		// if (!(response.status >= 200 && response.status < 300)) { ; return "" }
		var icons = response.data.icons
		var currentLargest = 0
		var largestIndex = null;

		//First check those with the size property,  default to largest. then resort to checking manually
		for (var i = 0; i < icons.length; i++) {
			if (icons[i].hasOwnProperty("sizes")) {
				var size = icons[i].sizes
				var idx1 = size.indexOf("x")
				var size = parseInt(size.substring(0, idx1))
				if (size > currentLargest) {
					largestIndex = i
				}
			}
		}
		if (largestIndex != null) {
			// console.log("largest: " + icons[largestIndex].src)
			// process.exit()
			var relPath = await dlImage(icons[largestIndex].src)
			console.log("relp" + relPath + sourceName)
			var fullPath = await checkConvertPngRename(relPath, sourceName)
			return fullPath
			// return fullPath
		}

		//no size property
		var checkImgUrlList = []
		if (largestIndex == null) {
			for (var i = 0; i < icons.length; i++) {
				if (!icons[i].src.endsWith(".ico")) {
					checkImgUrlList.push(icons[i].src)
				}
			}



			var imgRelPathList = []
			for (var i = 0; i < checkImgUrlList.length; i++) {
				await delay()
				var url = checkImgUrlList[i]
				var relPath = await dlImage(url)
				imgRelPathList.push(relPath)
			}

			var largestWidth = 0
			var largestIndex = -1
			var fullPathList = []

			for (var i = 0; i < imgRelPathList.length; i++) {
				var fullPath = Path.resolve(__dirname + '/../../dist/assets/' + imgRelPathList[i])
				var dimensions = await sizeOf(fullPath)
				var width = dimensions.width
				if (width > largestWidth) {
					largestWidth = width
					largestIndex = i
				}
				fullPathList.push(fullPath)
			}

			var bad = false
			if (imgRelPathList.length > 0) {
				console.log("endp" + imgRelPathList[largestIndex] + sourceName)
				
				var endPath = await checkConvertPngRename(imgRelPathList[largestIndex], sourceName)
			}
			else {
				console.log(`no logos for ${sourceName}`)
				bad = sourceName
			}

			for (var i = 0; i < fullPathList.length; i++) {
				if (fullPathList[i] != endPath) {
					fs.unlink(fullPathList[i], () => { })
				}
			}

			return (bad)
		}
		console.log("something went wrong largest index isn't null")
	} catch (e) { console.log(e); console.log("favicon dl fail no 200"); return "" }
}

async function dlImage(imgUrl) {
	try {
		var err = false
		const response = await Axios({
			method: 'GET',
			"url": imgUrl,
			responseType: 'stream'
		}).catch(() => { err = true; console.log("error fav dl " + imgUrl) })
		if (err) { return "" }



		var imageType = response.headers["content-type"].split("/")[1]
		//png
		var name = uuidv1() + "." + imageType
		var path = Path.resolve(__dirname + '/../../dist/assets/' + name)
		response.data.pipe(fs.createWriteStream(path))

		return new Promise((resolve, reject) => {
			response.data.on('end', () => {
				resolve(name)
			})
			response.data.on('error', () => { console.log("image fav dl failure:" + imgUrl); console.log(response.status); reject("") })

		})

	}
	catch (e) { console.log("dlimg error"); return "" }
}
async function getSources() {
	var response = await newsapi.v2.sources({
		country: 'us',
		language: 'en'
	})
	if (response['status'] == 'ok') {
		var sources = response["sources"]
		for (var i = 0; i < sources.length; i++) {

			var url = sources[i]["url"]
			var sourceName = sources[i]["id"]
			if (!sourceName) {
				sourceName = sources[i]["name"]
			}
			// console.log(url + sourceName)
			await delay()
			await getFavicon(url, sourceName)

		}

	}
}