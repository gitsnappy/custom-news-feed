import { observable } from 'mobx';
const axios = require('axios');
const autoBind = require('auto-bind');

export default class Store {
	constructor() {
		autoBind(this)
		this.articles = observable([])
		this.filters = observable([])
		this.filterOptions = observable([])
		this.top = observable.box(true)
		this.hideFilters = observable.box(true)
		this.checked = observable([])
		this.baseCategories = observable(["technology", "science", "business", "health", "entertainment", "general", "sports"])
		this.categoryOptions = observable(["technology", "science", "business", "health", "entertainment", "general", "sports"])
		this.displayCategories = observable(this.categoryOptions.slice())
		this.feeds = observable([])

		this.selectedCategories = observable(["technology"])
		this.page = observable.box(0)
		this.layout = observable.box(0) //0 grid, 1 row, 2 reader
		this.username = observable.box("")
		this.initUsername()
	}

	getFeeds(){
		return this.feeds
	}

	updateFeeds() {
		this.feeds.length = 0
		fetch('api/getFeeds', {
			method: 'GET',
		}
		).then((response) => { return response.json() }
		).then((json) => {
			for (var i = 0; i < json.length; i++) {
				this.feeds.push(json[i].name)
				this.categoryOptions.push(json[i].name)
			}
		})

	}

	updateCategoryOptions() {
		this.categoryOptions.length = 0
		for (var i = 0; i < this.baseCategories.length; i++) {
			this.categoryOptions.push(this.baseCategories[i])
		}

		this.updateFeeds()
	}

	getUsername() {
		return this.username.get()
	}


	initUsername() {
		var x = localStorage.getItem('username')
		if (x) {
			this.username.set(x)
			this.updateCategoryOptions()
		}

	}

	login(username) {
		this.username.set(username)
		localStorage.setItem('username', username);
		this.updateCategoryOptions()
	}

	logout() {
		localStorage.removeItem('username');
		this.username.set("")
		fetch('api/logout', {
			method: 'POST',
		}
		).then(response => {
			return response.text()
		}).then(text => {
		})

		window.location.href = "/"
	}


	setLayout(lay) {
		this.layout.set(lay)
	}
	getLayout() {
		return this.layout.get()
	}

	getPage() {
		return this.page.get()
	}

	setPage(page) {
		this.page.set(page)
	}


	get articleList() {
		return this.articles
	}

	applyFilters() {
		this.getArticles()
	}

	toggleOption(index) {
		this.filters[index] = !this.filters[index]
	}

	getHide() {
		return this.hideFilters.get()
	}

	toggleHide() {
		this.hideFilters.set(!this.hideFilters.get())
	}


	toggleTop() {
		this.top.set(!this.top.get())
	}

	getTop() {
		return this.top.get()
	}

	getFilterOptions() {
		return this.filterOptions
	}

	async fetchFilterOptions() {
		this.filterOptions.length = 0
		this.filters.length = 0
		const response = await axios.post('/api/filters').catch((e) => { console.log(e) })
		for (var i = 0; i < response.data.length; i++) {
			this.filterOptions.push(response.data[i].sourcename)
			this.filters.push(false)
		}
	}


	setCategory(cat) {
		this.selectedCategories.length = 0
		this.selectedCategories.push(cat)
		this.setPage(0)
		this.getArticles()
	}

	getCategory() {
		return this.selectedCategories[0]
	}

	getCategoryOptions() {
		return this.categoryOptions
	}

	getBaseCategories() {
		return this.baseCategories
	}

	getDisplayCategories() {
		return this.displayCategories
	}

	updateDisplayCategories(newCats) {
		this.displayCategories.length = 0
		this.displayCategories.splice(0, 0, ...newCats)

		sendList = []
		for (var i = 0; i < this.displayCategories.length; i++) {
			var val = this.displayCategories[i]
			if (!this.baseCategories.includes(val)) {
				sendList.push(val)
			}
		}


		fetch('api/updateDisplayCats', {
			method: 'POST',
			data: {
				"send": sendlist
			}
		}
		).then(response => {
			return response.text()
		}).then(text => {
			console.log(text)
		})

	}


	async getArticles() {
		var filterWords = []
		this.filters.forEach((element, index) => {
			if (element) {
				filterWords.push(this.filterOptions[index])
			}
		});

		var base = false
		if (this.baseCategories.includes(this.getCategory())){
			base = true
		}



		this.articles.length = 0
		var reader = (this.getLayout() == 2)

		const response = await axios.post('/api/articles', {
			"top": this.top,
			"filters": filterWords,
			"categories": this.selectedCategories,
			"page": this.getPage(),
			"reader": reader,
			"base": base
		}).catch((e) => { console.log(e) })

		for (var i = 0; i < response.data.length; i++) {
			var url = response.data[i].url
			var ts = response.data[i].articletimestamp
			var imageFile = response.data[i].imagefilename
			var source = response.data[i].sourcename
			var title = response.data[i].title
			var category = response.data[i].category

			this.articles.push({
				"url": url,
				"source": source,
				"imageFile": imageFile,
				"ts": ts,
				"title": title,
				"category": category
			})
		}

	}



}