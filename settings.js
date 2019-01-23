
import { observer } from 'mobx-react';
import React, { Component } from 'react';
const autoBind = require('auto-bind');
@observer
export default class Settings extends Component {
	constructor(props) {
		super(props)
	}


	async componentDidMount() {
		this.props.store.fetchFilterOptions()
	}

	render() {
		return <Checkboxes store={this.props.store}></Checkboxes>
	}

}


@observer
class Checkboxes extends Component {
	constructor(props) {
		super(props)
		autoBind(this)
		this.filterOptions = []


	}
	componentDidMount() {
		this.filterOptions = this.props.store.getFilterOptions()
	}


	eachBox(ele, index) {
		return (
			<Checkbox store={this.props.store} key={ele} ele={ele} index={index}></Checkbox>
		)
	}

	render() {
		return (
			<div className="settings" style={{ visibility: (this.props.store.getHide() ? 'hidden' : 'visible') }}>
				<div className="settingsHeader">
					<span className="settingsPara" >Exclude list </span>
					<span>
						<button className="filterApply" onClick={this.props.store.applyFilters}>Apply</button>
						<button onClick={this.props.store.toggleHide}>Exit</button>
					</span>

				</div>
				{
					this.filterOptions.map(this.eachBox)
				}

			</div>


)
	}
}

class Checkbox extends React.Component {
	constructor(props) {
		super(props)
		autoBind(this)
	}
	toggle() {
		this.props.store.toggleOption(this.props.index)
	}
	render() {
		return (
			<div>
				<label className="settingsPara filterLabel checkFont">
					<input type="checkbox" className="filterBox" onChange={this.toggle}></input>
					&nbsp; {this.props.ele}
				</label>
			</div>
		)
	}
}
