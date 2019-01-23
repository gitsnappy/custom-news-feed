import "babel-polyfill";
import React, { Component } from 'react';
import '../dist/main.css'
import { observer } from 'mobx-react';
import Settings from "./settings";
import Store from "./store";

import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import Contact from './contact'
import Feeds from "./feeds";
import Login from "./login"
const autoBind = require('auto-bind');

@observer
export default class App extends Component {
	constructor(props) {
		super(props)
		this.store = new Store()
	}

	async componentDidMount() {
		await this.store.getArticles()
	}

	render() {
		return (

			<Router>
				<div className="container" >
					<HeaderBar store={this.store}></HeaderBar>
					{getRoutes(this.store)}
					<FooterBar></FooterBar>

				</div>
			</Router>)
	}
}

const getRoutes = (store) => {
	return (
		<Switch>
			<Route path="/" exact render={() => <Display store={store}></Display>} />
			<Route path="/contact-us/" component={Contact} />
			<Route path="/my-feeds/" render={() => <Feeds store={store}></Feeds>} />
			<Route path="/login/" render={() => <Login store={store}></Login>} />
		</Switch>)


}

@observer
class Display extends Component {
	constructor(props) {
		super(props)
		// autoBind(this)
	}

	render() {
		{
			var page = this.props.store.getPage()
		}

		return (
			<React.Fragment>
				<header style={{ textAlign: "center" }} >
					{page == 0 ? <h1 className="h1"><a className="bannerLink" href="/"></a></h1> : <React.Fragment></React.Fragment>}
				</header>
				<CategoryFilter store={this.props.store} ></CategoryFilter>
				<Layouts store={this.props.store}></Layouts>
				<NextPage store={this.props.store}></NextPage>
			</React.Fragment>
		)
	}
}

@observer
class Layouts extends Component {
	constructor(props) {
		super(props)
	}
	render() {
		{ var layout = this.props.store.layout.get() }
		return (
			<React.Fragment>
				{layout == 0 ? <MagazineLayout store={this.props.store}></MagazineLayout> : <React.Fragment></React.Fragment>}
				{layout == 1 ? <RowLayout store={this.props.store}></RowLayout> : <React.Fragment></React.Fragment>}
				{layout == 2 ? <ReaderLayout store={this.props.store}></ReaderLayout> : <React.Fragment></React.Fragment>}
			</React.Fragment>
		)
	}

}


@observer
class HeaderBar extends Component {
	constructor(props) {
		super(props)
		autoBind(this)
	}


	logout() {
		this.props.store.logout()
	}


	render() {
		var username = this.props.store.getUsername()
		return (
			<React.Fragment>
				<header className="header">
					<span style={{ display: "flex" }}>
						<Link className="headerLogo" to="/">
							<img src="logo/logo.png" className="logo" ></img>
						</Link>
						<span className='headerSpan'>Your News. Your Way.</span>

					</span>

					{/* <button className="filtersButton" onClick={this.props.store.toggleHide}>Filters</button> */}
					{username == "" ?
						<form action="/login">
							<input className="filtersButton" type="submit" value="Login" />
						</form>
						:
						<a className="text logout" onClick={this.logout}>{username}: Logout</a>
					}

					<Settings store={this.props.store}></Settings>
				</header >

			</React.Fragment >)
	}
}

// <label className="switch">
// 	<span className="switchLabel">Top Stories</span>
// 	<input type="checkbox" defaultChecked onChange={() => {
// 		this.props.store.toggleTop()
// 		this.props.store.getArticles()
// 	}}></input>
// 	<span className="slider round"> </span>
// </label>


class Row extends Component {
	constructor(props) {
		super(props)
		this.obj = articleConvert(this.props.art)
		this.srcset = this.obj.imgName + ' 135w'

	}

	render() {
		return (
			<div className="summary">
				<div className="croppedRow" >
					<a href={this.obj.url}>
						<img src={this.obj.imgMobile} srcSet={this.srcset} sizes="(min-width: 420px) 135px, 75px" alt={this.obj.title} className="sumImg"></img>
					</a>
				</div>
				<NewsSource source={this.obj.source}
					date={this.obj.date} text={this.obj.title} link={this.obj.url} iconSrc={this.obj.iconSrc}></NewsSource>
				&nbsp;
		<span className="sideSpace" ></span>
			</div >
		)
	}
}

@observer
class RowLayout extends React.Component {
	constructor(props) {
		super(props)
	}
	render() {
		const { articles } = this.props.store

		return (
			<div className="rowContainer">
				{
					articles.map((item) => (
						<Row key={item.url} art={item}></Row>
					))
				}

			</div>
		)

	}
}

@observer
class MagazineLayout extends React.Component {
	constructor(props) {
		super(props)
		// console.log(this.props.articles.length)

	}


	render() {
		const { articles } = this.props.store
		return (
			<div className="magContainer">
				{
					articles.map((item) => (
						<MagazineArticle key={item.url} art={item} img={item.imageFile} title={item.title}  ></MagazineArticle>

					))
				}
			</div>

		)
	}
}
class MagazineArticle extends React.Component {
	constructor(props) {
		super(props)

		this.obj = articleConvert(this.props.art)
		this.left = 0
		this.top = 0
		this.artRef = React.createRef()
		this.imgRef = React.createRef()

	}

	componentDidUpdate() {
		//todo center images
		// this.left = (this.artRef.current.offsetWidth -this.imgRef.current.naturalWidth) / 2
		// this.top = (200 - this.imgRef.current.naturalHeight) / 2
	}


	render() {
		return (
			<React.Fragment>
				<article ref={this.artRef} className="article">
					<div className="croppedMag">
						<a href={this.obj.url} >
							<img ref={this.imgRef} src={this.obj.imgMobile} srcSet={this.obj.srcset} sizes="(min-width: 420px) 375px, 140px" alt={this.obj.title} className="magImg" style={{ left: this.left, top: this.top }} ></img>
						</a>
					</div>
					<span className="iconSpan">
						<img className="newsIcon"
							onError={(e) => { e.target.onerror = null; e.target.style.visibility = 'hidden' }}
							src={this.obj.iconSrc}
						></img>
						<span className="src">{this.obj.source}</span>
						<span className="date">{this.obj.date}</span>
					</span>
					<br />
					<a className="link" href={this.obj.url}>{this.obj.title}</a>
				</article>

			</React.Fragment>
		)
	}

}
function articleConvert(art) {

	var imageloc = `assets/${art.source}.png`
	var options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
	var adate = new Date(art.ts);
	var date = adate.toLocaleDateString("en-US", options)
	var imgName = ""
	var imgMobile = ""
	var srcset = ""
	if (art.imageFile != "none" && art.imageFile.trim() != "") {
		imgName = "images/" + art.imageFile
		imgMobile = "mobileimages/" + art.imageFile
		srcset = imgName + ' 375w'
	}
	var source = capitalizeText(art.source)


	return {
		"url": art.url,
		"source": source,
		"imgName": imgName,
		"imgMobile": imgMobile,
		"srcset": srcset,
		"iconSrc": imageloc,
		"date": date,
		"title": art.title
	}
}





export function capitalizeText(text) {
	var idx = text.indexOf(".")
	if (idx != -1) {
		text = text.substring(0, idx)
	}
	var regex = /-/gi;
	text = text.replace(regex, " ")
	text = text.toLowerCase()
		.split(' ')
		.map((s) => s.charAt(0).toUpperCase() + s.substring(1))
		.join(' ');

	if (text.length < 5) {
		text = text.toUpperCase()
	}

	return text
}


class NewsSource extends Component {
	constructor(props) {
		super(props)
		// this.imageloc = `assets/${this.props.iconSrc}.png`

		this.srcText = capitalizeText(this.props.source)


	}
	render() {
		return <span className="newsSource">
			<img className="newsIcon" onError={(e) => { e.target.onerror = null; e.target.style.visibility = 'hidden' }} src={this.props.iconSrc} height="40" width="40"></img>
			<span className="src">{this.srcText}</span>
			<span className="date">{this.props.date}</span>
			<br />
			&nbsp;
        <a className="link" href={this.props.link}>{this.props.text}</a>
		</span>
	}


}


@observer
class CategoryButton extends Component {
	constructor(props) {
		super(props)
		autoBind(this)
	}

	click() {
		this.props.store.setCategory(this.props.ele)
	}

	render() {
		{ var f = (this.props.ele == "My Feeds") }
		return (
			(f ?
				<a href="/my-feeds" style={{ textDecoration: "none" }}>
					<li className="categoryList" style={{ color: "#d8d8d8" }} >{this.props.ele}</li>
				</a>
				:
				<li className="categoryList" style={this.props.store.getCategory() == this.props.ele ? { color: "black" } : { color: "#d8d8d8" }} onClick={this.click}>{this.props.ele}</li>
			)

		)

	}
}

@observer
class CategoryFilter extends Component {
	constructor(props) {
		super(props)
		autoBind(this)
	}

	eachBox(ele, index) {
		return (
			<CategoryButton store={this.props.store} key={ele} ele={ele} index={index} ></CategoryButton>
		)
	}

	render() {
		{ var categories = this.props.store.getCategoryOptions() }
		return (
			<div className="catBar">
				<ul className="Categories">
					{
						// this.categories.map(this.eachBox)
						categories.map(this.eachBox)
					}

					<CategoryButton store={this.props.store} key="My Feeds" ele={"My Feeds"}></CategoryButton>
				</ul>
				<span className="layouts">
					<LayoutButton src="magazine2" store={this.props.store} key={0} idx={0} title="Grid"></LayoutButton>
					<LayoutButton src="row2" store={this.props.store} key={1} idx={1} title="Row"></LayoutButton>
					<LayoutButton src="reader2" store={this.props.store} key={2} idx={2} title="Reader"></LayoutButton>
				</span>
			</div>
		)
	}
}

class LayoutButton extends Component {
	constructor(props) {
		super(props)
		autoBind(this)
	}
	setLayout() {
		this.props.store.setLayout(this.props.idx)
	}
	render() {

		return (
			<input type="image" onClick={this.setLayout} src={`icon/${this.props.src}.png`} className="layoutIcon"
				style={this.props.store.getLayout() == this.props.idx ? { opacity: 1 } : { opacity: 0.6 }}
				title={this.props.title}
			/>
		)
	}
}
class NewsApiAttribution extends Component {
	render() {
		return <a href="https://newsapi.org" className="attribution">Powered by News Api</a>
	}
}


class FooterBar extends Component {
	constructor(props) {
		super(props)
	}

	render() {
		return (
			<footer className="footer">
				<NewsApiAttribution></NewsApiAttribution>
				<a href="/privacy-policy" className="attribution" >Privacy Policy</a>
				<Link className="attribution" to="/contact-us">Contact Us</Link>
			</footer>
		)
	}
}

@observer
class NextPage extends Component {
	constructor(props) {
		super(props)
		autoBind(this)

	}


	nextPage() {
		this.props.store.setPage(this.props.store.getPage() + 1)
		// console.log(this.props.store.getPage())
		this.props.store.getArticles()


	}
	prevPage() {
		var page = this.props.store.getPage()
		if (page > 0) {
			this.props.store.setPage(page - 1)
			this.props.store.getArticles()
		}
	}


	render() {
		this.page = this.props.store.getPage()
		var buttons1 = []
		if (this.page >= 2) {
			for (var i = this.page - 2; i < this.page + 3; i++) {
				buttons1.push(i)
			}
		}
		else {
			for (var i = this.page; i < this.page + 5; i++) {
				buttons1.push(i)
			}
		}
		this.buttons = buttons1


		return (

			<React.Fragment>
				<div id="page" className="pageDisplay">Page {this.props.store.getPage() + 1}</div>

				<div className="navBox">
					<input type="image" onClick={this.prevPage} src={`icon/arrowleft.png`} className="arrowButton" />

					<span className="pageButtons">
						{this.buttons.map((item) => (
							<PageButton store={this.props.store} key={item} index={item}></PageButton>
						))
						}
					</span>
					<input type="image" width="40px" height="40px" onClick={this.nextPage} src={`icon/arrowright.png`} className="arrowButton" />
				</div>
			</React.Fragment>
		)
	}
}

@observer
class PageButton extends Component {
	constructor(props) {
		super(props)
		autoBind(this)
	}
	click() {
		this.props.store.setPage(this.props.index)
		this.props.store.getArticles()
	}


	render() {
		return (
			<button className="tealButton pageButton" onClick={this.click} index={this.props.index} >{this.props.index + 1}  </button>
		)
	}
}


@observer
class ReaderLayout extends Component {
	constructor(props) {
		super(props)
	}

	componentDidMount() {
		this.props.store.getArticles()
	}
	render() {
		const { articles } = this.props.store

		return (
			<div className="readerContainer">
				{
					articles.map((item) => (
						<Line key={item.url} art={item}></Line>
					))
				}

			</div>
		)

	}
}


class Line extends Component {
	constructor(props) {
		super(props)
		this.obj = articleConvert(this.props.art)



	}

	render() {
		return (
			<div className="line">
				{/* <img className="newsIcon" onError={(e) => { e.target.onerror = null; e.target.style.visibility = 'hidden' }} src={this.obj.iconSrc} height="40" width="40"></img> */}
				<span className="srcReader">{this.obj.source}</span>

				<a className="linkReader" href={this.obj.url}>{this.obj.title}</a>

			</div>

		)
	}

}
