"use strict";

import * as Randomstring from "randomstring";
import { ApiRequester } from "./apiRequester";
import { ConfirmRequest, LoginResponse, RegisterRequest, RegisterResponse } from "./types";

const CONFIRMATION_CHEAT = process.env.LSPAGENT_CONFIRMATION_CHEAT || "";

export class UserCreator {
	private _registerResponse: RegisterResponse | undefined;
	private _userData: LoginResponse | undefined;

	constructor(private _apiRequester: ApiRequester) {}

	async createUser() {
		await this.registerUser();
		await this.confirmUser();
		return this._userData;
	}

	async registerUser() {
		const username = Randomstring.generate(12);
		const email = `${username}@${Randomstring.generate(8)}.com`;
		const password = Randomstring.generate(8);
		const data = {
			email,
			password,
			username,
			_confirmationCheat: CONFIRMATION_CHEAT,
		} as RegisterRequest;
		this._registerResponse = (await this._apiRequester.request({
			method: "POST",
			path: "/no-auth/register",
			data,
		})) as RegisterResponse;
	}

	async confirmUser() {
		const data = {
			email: this._registerResponse!.user.email,
			confirmationCode: this._registerResponse!.user.confirmationCode,
		} as ConfirmRequest;
		this._userData = (await this._apiRequester.request({
			method: "POST",
			path: "/no-auth/confirm",
			data,
		})) as LoginResponse;
	}
}
