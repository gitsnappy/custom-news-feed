import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
const autoBind = require('auto-bind');
import { capitalizeText } from './App'

import '../dist/css/feed.css'

/*
1.  convert POST to get
2.  CSS module for contact.js and settings.js
3. 	registering a service worker for offline caching.
4.  nginx? 
*/


@observer
export default class Feeds extends Component {
	constructor(props) {
		super(props)
		var x = this.props.store.getUsername()
		if (x == "") {
			window.location.href = "/login"
		}
	}

	render() {
		return (
			<CreateFeed store={this.props.store}></CreateFeed>
		)

	}
}






@observer
class CatList extends Component {
	constructor(props) {
		super(props)
		autoBind(this)

		this.catText = observable.box("")
		this.cats = observable(this.props.store.getFeeds().slice())
	}

	addCat(cat) {
		this.cats.push(cat)
	}

	removeCat(cat) {
		var idx = this.cats.indexOf(cat)
		if (idx > -1) {
			this.cats.splice(idx, 1)
		}
	}

	update() {
		this.props.store.updateDisplayCategories(this.cats)
		var options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
		var adate = new Date();
		var date = adate.toLocaleDateString("en-US", options)
		this.catText.set("Updated at: " + date)
	}



	render() {
		{ var cats = this.props.store.getFeeds() }

		return (
			<div className="feedContainer">
				<p className="text para">Custom Feeds</p>
				<ul className="catColumn">
					{cats.map((item) => (
						// <button className="myButton catButtons" key={item} >{item}</button>
						<CatButton key={item} item={item} addCat={this.addCat} removeCat={this.removeCat} highlight={cats.indexOf(item) >= 0 ? true : false}  ></CatButton>
					))
					}
				</ul>
				<div className="flex">
					{/* <button className="text updateCat" onClick={this.update}>Update Feeds</button> */}
					<span id="catText" className="text">{this.catText.get()}</span>
				</div>
			</div>
		)
	}
}

@observer
class CatButton extends React.Component {
	constructor(props) {
		super(props)
		autoBind(this)
		this.selected = observable.box(true)
		this.selected.set(this.props.highlight)


	}

	toggle() {
		var get = !this.selected.get()
		this.selected.set(get)
		get ? this.props.addCat(this.props.item) : this.props.removeCat(this.props.item)
	}

	render() {
		return (
			<button className={this.selected.get() ? "myButton gray" : "myButton unselected"} onClick={this.toggle} >{this.props.item}</button>
		)
	}
}

@observer
class CreateFeed extends Component {
	constructor(props) {
		super(props)
		this.text = observable.box("")
		this.grid = observable([])
		this.page = observable.box(0)
		this.selectedCat = ""
		this.selectedList = observable([])
		autoBind(this)
	}

	handleSubmit(event) {
		event.preventDefault()
		if (this.selectedList.length > 100 || this.selectedList.length < 1) {
			this.text.set("limit 0 - 100 sources")
			return
		}
		const formData = new FormData(event.target)
		var title = formData.get("feedName");
		var arry = JSON.stringify(this.selectedList)

		// http://server/url?array=["foo","bar"]
		// Server side

		fetch(`/api/createfeed?arry=${arry}&title=${title}`)
			.then(response => {
				return response.text()
			}).then(text => {
				switch (parseInt(text)) {
					case 2: this.text.set(`Feed ${title} already exists`); break;
					case 1: this.text.set(`Created ${title}`);
						this.props.store.updateCategoryOptions()
						break;
					default: this.text.set("Error"); break;
				}
			}).catch(error => {
				this.text.set("error")
			})

	}








	addRemove(item, border) {
		if (border) {
			this.selectedList.push(item)
		}
		else {
			var idx = this.selectedList.indexOf(item)
			this.selectedList.splice(idx, 1)
		}
	}

	getStatus(item) {
		return this.selectedList.indexOf(item) != -1
	}

	setExploreCategory(item) {
		if (item != this.selectedCat) { this.page.set(0) }
		this.selectedCat = item
		fetch(`/api/topCat?cat=${item}&page=${this.page.get()}`)
			.then((response) => { return response.json() })
			.then((json) => {
				this.grid.length = 0
				for (var i = 0; i < json.length; i++) {
					this.grid.push(json[i])
				}
			})
			.catch(error => {
				console.log(error)
			})

	}
	//
	nextPage() {
		this.page.set(this.page.get() + 1)
		this.setExploreCategory(this.selectedCat)
	}
	prevPage() {
		var page = this.page.get()
		if (page > 0) {
			this.page.set(page - 1)
			this.setExploreCategory(this.selectedCat)
		}
	}

	componentDidMount() {
		this.setExploreCategory(this.props.store.getCategory())

	}

	render() {
		{
			var cats = this.props.store.getBaseCategories()
		}
		return (
			<React.Fragment>
				<CatList store={this.props.store}></CatList>
				<form className="feedContainer" onSubmit={this.handleSubmit} method="GET">
					<div className="section titleContainer">
						<h1 className="text para">Create New Feed</h1>

						<span className="text">Title</span><input className="titleInput" type="text" name="feedName" required minLength="1" maxLength="30" /><br />


					</div>
					<div className="section">
						<h2 className="text para">Choose a Topic to Explore Sources</h2>
						<ul className="text sourceButtons">
							{cats.map((item) => (
								<ExploreButton key={item} item={item} func={this.setExploreCategory}></ExploreButton>
							))}
						</ul>

					</div>

					<div className="section">
						<h1 className="text para sourceHeader">Choose Sources</h1>
						<div className="sourceGrid">
							{this.grid.map((item) => (
								<BigIcon key={item} item={item} func={this.addRemove} getStatus={this.getStatus}></BigIcon>
							))}
						</div>
					</div>
					<div className="navBox nav">
						<input type="image" onClick={this.prevPage} src={`icon/arrowleft.png`} className="arrowButton" />
						<span className="text">Previous/Next Page</span>
						<input type="image" width="40px" height="40px" onClick={this.nextPage} src={`icon/arrowright.png`} className="arrowButton" />
					</div>
					<button className="myButton gray createFeed">Create</button>

					<p id="response" className="response">{this.text.get()}</p>
				</form>
			</React.Fragment>)

	}


}

@observer
class BigIcon extends Component {
	constructor(props) {
		super(props)
		autoBind(this)
		this.border = observable.box(false)
	}

	onClick() {
		this.border.set(!this.border.get())
		this.props.func(this.props.item, this.border.get())

	}

	componentDidMount() {
		this.border.set(this.props.getStatus(this.props.item))
	}


	render() {
		return (
			<div className={this.border.get() ? "iconContainer iconContainerSelected" : "iconContainer"} onClick={this.onClick} >
				<img className="bigIcon"
					onError={(e) => { e.target.onerror = null; e.target.style.visibility = 'hidden'; }}
					// onClick={this.onClick}
					src={`assets/${this.props.item}.png`}
				></img>
				<div className="text descContainer" >
					{/* change format later when have decscriptions */}
					<p>{capitalizeText(this.props.item)}</p>
					<p>&nbsp;</p>
				</div>
			</div>
		)
	}
}

@observer
class ExploreButton extends Component {
	constructor(props) {
		super(props)
		autoBind(this)
	}

	click() {
		this.props.func(this.props.item)
	}


	render() {
		return (
			<button className="myButton gray" onClick={this.click}>{this.props.item}</button>

		)
	}

}
