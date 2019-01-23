
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
const autoBind = require('auto-bind');
import '../dist/css/login.css'

@observer
export default class Login extends Component {
	constructor(props) {
		super(props)
		autoBind(this)
		this.register = observable.box(false)
		this.text = observable.box("")
	}


	login(data) {
		var un = data.get("username")

		var msg = ""
		fetch('api/login', {
			method: 'POST',
			body: data
		}
		).then(response => {
			return response.text()
		}).then(text => {
			switch (parseInt(text)) {
				case 1: msg = "Success!";
					this.props.store.login(un)
					setTimeout(() => { window.location.href = "/" }, 2000); break;
				default: msg = "Authentication Failed"; break; //0
			}
			this.text.set(msg)

		}).catch(error => {
			this.text.set("Unknown error")
			console.log(error)
		})


	}

	postRegister(data) {
		fetch('api/register', {
			method: 'POST',
			body: data
		}
		).then(response => {
			return response.text()
		}).then(text => {
			console.log(text)

			var msg = ""
			switch (parseInt(text)) {
				case 0: msg = "Missing Required Field"; break;
				case 1: msg = "Username Already Taken"; break;
				case 2: msg = "Account Created!";
					setTimeout(() => { window.location.href = "/" }, 2000);

					break;
				default: msg = "Unknown Failure"; break;
			}
			this.text.set(msg)
		}).catch(error => {
			this.text.set("Unknown error")
		})

	}

	handleSubmit(event) {
		event.preventDefault()
		this.text.set("Sending...")
		const data = new FormData(event.target)
		this.register.get() ? this.postRegister(data) : this.login(data)

	}

	onClick() {
		this.register.set(!this.register.get())
	}

	render() {
		return (
			<form className="loginForm" onSubmit={this.handleSubmit} method="POST">
				<div className="text login">
					{this.register.get() ? <h1 className="text head">Create an Account</h1> : <h1 className="text head">Login</h1>}
					{this.register.get() ? <React.Fragment> <span>Email</span><input className="input" placeholder="Optional" type="text" name="email" maxLength="255" /><br /></React.Fragment> : <React.Fragment></React.Fragment>}
					<span>Username</span><input className="input" minLength="1" type="text" name="username" maxLength="30" /><br />
					<span>Password</span><input className="input" minLength="1" type="password" name="password" maxLength="128"></input>
					<input style={{ display: "none" }} value="0" autoComplete="false" className="input" type="checkbox" name="honypot" maxLength="1"></input>

					<div className="loginLine">
						{this.register.get() ? <input type="submit" value="Create Account" className="submitButton" /> : <input type="submit" value="Login" className="submitButton" />}
						{this.register.get() ? <li className="text create" onClick={this.onClick}>Login</li> : <li className="text create" onClick={this.onClick}>Create an account</li>}
					</div>
					<p id="response" className="response">{this.text.get()}</p>


				</div>
			</form>)
	}
}



