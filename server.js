const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var secret = ""


var express = require('express')
var cookieParser = require('cookie-parser')
var path = require('path')
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();
var https = require('https')
var fs = require('fs')

var app = express()

const { Client } = require('pg')
const format = require('pg-format')
const client = new Client({
	user: '',
	host: 'localhost',
	database: '',
	password: '',
	port: 5432,
})

client.connect()


async function getArticles(resp, top, filters, categories, page, reader, base, username) {
	filters.push('') //for empty arry

	var mult = reader ? 2 : 1
	var offset = page * 12 * mult
	var articles = 12 * mult
	var sql = ""
	var feedIds = []

	//get feed source list
	//insert into query
	if (!base && username) {
		var id = await getUserId(username)
		var query = {
			"text": `select source_id from feed where user_id=$1 and name=$2`,
			"values": [id, categories[0]]
		}
		var res = await client.query(query).catch((e) => console.log(e))
		for (var i = 0; i < res.rows.length; i++) {
			feedIds.push(res.rows[i].source_id)
		}

	}
	var a = `select s.sourcename, a.title, a.url, a.imagefilename, a.articletimestamp, a.category 
  from article a, source s 
  where s.id = a.sourceid 
	and topstory=$1 
	and a.imagefilename != '' `

	var b = `and s.sourcename not in (%L) `

	var c = `and a.category in (%L) `

	if (!base) {
		c = `and a.sourceid in (%L) `
	}

	var d = `order by articletimestamp desc limit $2 offset $3`

	if (top) {
		var src = categories
		if (!base && feedIds.length > 0) { src = feedIds }
		sql = format(a + b + c + d, filters, src)
	}
	else {
		sql = format(a + c + d, filters)

	}



	var query = {
		"text": sql,
		"values": [top, articles, offset]
	}



	var res = await client.query(query).catch((e) => console.log(e))

	if (res) { resp.send(res.rows) }
	else { resp.send("0") }

}

async function getTopFilters(resp) {
	var query = {
		"text": ` SELECT s.sourcename 
    FROM article a, source s
    where a.sourceid = s.id
    GROUP BY a.sourceid, s.sourcename
    ORDER BY count(sourceid) DESC
    LIMIT 20`
	}
	var res = await client.query(query).catch((e) => console.log(e))
	resp.send(res.rows)
}

async function updateDisplay(res, username, send) {
	var id = await getUserId(username)

	//base?
	var query = {
		"text": `delete from display where user_id=$1`,
		"values": [id]
	}
	var result = await client.query(query).catch((e) => console.log(e))


	for (var i = 0; i < send.length; i++) {
		var query = {
			"text": `select id from feed where user_id = $1 and name=$2`,
			"values": [id, send[i]]
		}
		var result = await client.query(query).catch((e) => console.log(e))
		var feedId = result.rows[0].id



		var query = {
			"text": `insert into display (user_id, feed_id) values ($1, $2)`,
			"values": [id, feedId]
		}

		var result = await client.query(query).catch((e) => console.log(e))
		if (result) {
			res.send("1")
		}
		else {
			res.send("0")
		}

	}


}

async function sendFeed(res, username) {
	var query = {
		"text": `select distinct name from feed f, users u where u.id=f.user_id and u.username = $1`,
		"values": [username]
	}
	var result = await client.query(query).catch((e) => console.log(e))
	res.send(result.rows)
}

async function getUserId(username) {
	var query = {
		"text": `select u.id from  users u where u.username =$1`,
		"values": [username]
	}
	var res = await client.query(query).catch((e) => console.log(e))
	return res.rows[0].id
}

async function createFeed(resp, username, arry, feedname) {
	/*
	0: bad request
	1: success
	2: feed already exists
	*/
	var query = {
		"text": `select u.id from feed f, users u where u.id=f.user_id and f.name =$1 and u.username = $2`
		,
		"values": [feedname, username]
	}
	var res = await client.query(query).catch((e) => console.log(e))
	if (res.rowCount > 0) {
		resp.send("2")
		return
	}

	var vals = ""
	var cur = 3
	for (var i = 0; i < arry.length; i++) {
		vals += `($2,(select id from users where username = $1),(select id from source where sourcename = $${cur})),`
		cur += 1
	}
	vals = vals.slice(0, -1);


	var query = {
		"text": `INSERT into feed (name, user_id, source_id) values ${vals}`
		,
		"values": [username, feedname, ...arry]
	}
	var res = await client.query(query).catch((e) => { resp.send("0"); console.log(e); })
	if (res) {
		resp.send("1")
	}

}

async function getTopCategorySources(cat, page, resp) {

	var offset = page * 24

	var query = {
		"text":
			`select s.sourcename 
 FROM article a,source s 
 where a.sourceid = s.id and 
 a.category=$1
 GROUP BY a.sourceid, s.sourcename     
 ORDER BY count(sourceid) DESC
	limit 24 offset $2`,
		"values": [cat, offset]
	}
	var res = await client.query(query).catch((e) => console.log(e))

	var arry = []
	for (var i = 0; i < res.rows.length; i++) {
		arry.push(res.rows[i].sourcename)
	}
	resp.send(arry)
	// resp.send(res.rows)

}

function generateToken(user) {
	return jwt.sign({
		username: user
	}, secret, { expiresIn: '7d' });
}


async function authUser(res, username, password) {
	var query = {
		"text": `select password from users where username=$1`,
		"values": [username]
	}

	var result = await client.query(query).catch((e) => console.log(e))
	if (!result) { res.send("0"); return }
	var hash = result.rows[0].password

	bcrypt.compare(password, hash, function (err, result) {

		if (result) {
			var exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
			res.cookie('token', generateToken(username), { expires: exp, httpOnly: true });
			res.send("1")
		} else {
			res.send("0")
		}


	});

}

async function registerUser(res, email, username, password) {
	//timestamp created, ip address
	/*
	codes: 
		0: username/pw too short
		1: username taken
		2: success
		3: unknown failure
	*/
	if (password.length == 0 || username.length == 0 || username.length > 30 || password.length > 128 || email.length > 255) { res.send("0"); return }
	var query = {
		"text": `select username from users where username=$1`,
		"values": [username]
	}
	var result = await client.query(query).catch((e) => console.log(e))
	if (result && result.rows.length > 0) { res.send("1"); return }


	bcrypt.genSalt(async (err, salt) => {
		bcrypt.hash(password, salt, async (err, hash) => {
			var query = {
				"text": `insert into users (username, password, salt, email) values ($1,$2,$3,$4)`,
				"values": [username, hash, salt, email]
			}
			var result = await client.query(query).catch((e) => console.log(e))
			if (result && result.rowCount > 0) { res.send("2"); return }
			else { res.send("3"); return }

		})

	})



}


var static = express.static(path.join(__dirname + "/../dist"))
app.use(static);
app.use(bodyParser.json()); // for parsing application/json
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(upload.array()); //multi-part/formdata


app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname + '/index.html'))
})

app.get('/my-feeds', (req, res) => {
	res.sendFile(path.join(__dirname + '/index.html'))
})

app.get('/login', function (req, res) {
	res.sendFile(path.join(__dirname + '/index.html'))
})


app.get('/contact-us', (req, res) => {
	res.sendFile(path.join(__dirname + '/index.html'))
})

app.get("/privacy-policy", (req, res) => {
	res.sendFile(path.join(__dirname + '/extra/privacy_policy.html'))
})



app.get("/api/topCat", function (req, res) {
	getTopCategorySources(req.query.cat, req.query.page, res)
})

app.post("/api/contactSubmit", function (req, res) {
	var query = {
		text: `insert into message (email, message) values ($1,$2)`,
		values: [req.body.email, req.body.message]
	}
	client.query(query).catch((e) => console.log(e))


	res.send(true)
})

app.post('/api/register', function (req, res) {
	if (req.body.username && req.body.password && !req.body.honypot) {
		registerUser(res, req.body.email, req.body.username, req.body.password)
	}
	else {
		res.send("0")
	}
})

app.post('/api/login', function (req, res) {
	if (req.body.username && req.body.password) {
		authUser(res, req.body.username, req.body.password)
	}
})

app.post('/api/logout', function (req, res) {
	res.clearCookie("token");
	res.send("0")
})

app.post("/api/filters", function (req, res) {
	getTopFilters(res)
})

app.get("/api/getFeeds", function (req, res) {
	if (req.cookies.token) {
		var decoded = jwt.verify(req.cookies.token, secret);

		if (decoded) {
			sendFeed(res, decoded.username)
		} else { res.send("0") }

	} else { res.send("0") }
})

app.post("/api/updateDisplayCats", function (req, res) {
	if (req.cookies.token) {
		var decoded = jwt.verify(req.cookies.token, secret);

		if (decoded) {
			updateDisplay(res, decoded.username, req.body.send)
		} else { res.send("0") }
	} else { res.send("0") }


})

app.get("/api/createFeed", function (req, res) {
	if (req.query.arry && req.cookies.token && req.query.title) {
		var decoded = jwt.verify(req.cookies.token, secret);
		var arry = JSON.parse(req.query.arry);

		if (decoded && req.query.title.length > 0 && req.query.title.length < 31 && arry.length > 0 && arry.length < 101) {
			createFeed(res, decoded.username, arry, req.query.title)
		} else { res.send("0") }
	} else { res.send("0") }

})


app.post('/api/articles', upload.array(), function (req, res) {
	var top = (req.body.top ? true : false)
	var username = ""
	if (req.cookies.token) {
		var decoded = jwt.verify(req.cookies.token, secret);
		username = decoded.username
	}
	getArticles(res, top, req.body.filters, req.body.categories, req.body.page, req.body.reader, req.body.base, username)
})



// app.listen(80, () => console.log("Listening on port 80!"));

https.createServer({
  key: fs.readFileSync(path.join(__dirname + '/../../privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname + '/../../fullchain.pem'))
}, app)
.listen(443, function () {
  console.log('Listening on port 443!')
})

var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(80);


