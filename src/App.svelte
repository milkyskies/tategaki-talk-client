<script lang="ts">
	import { onMount, tick } from "svelte";
	import Message from "./components/Message.svelte";
	import InputField from "./components/InputField.svelte";
	import { getUserId, getUsername, setUsername } from "./lib/localStorage";
	let username = "";
	let message = "";
	let messages: { userId: string; sender: string; message: string }[] = [];
	let inputDisabled = false;
	let scrollMode = "auto";

	let socket: null | WebSocket = null;
	let inputField: null | InputField;
	let board: null | Element;

	let inputPlaceholder = "メッセージを入力";

	const currentUserId = getUserId();

	const scrollToBottom = async () => {
		await tick();
		board.scrollLeft = -board.scrollWidth;
	};

	const handleSubmit = () => {
		let payload = {};

		if (!message) {
			return;
		}

		if (message === "/clearname") {
			localStorage.removeItem('tategaki-talk-username');
			username = "";
			inputPlaceholder = "お名前を入力してください";
		}
		else if (username === "") {
			username = message;
			setUsername(username);
			inputPlaceholder = "メッセージを入力";
		} 
		else {
			messages = [...messages, { userId: currentUserId, sender: username, message }];
			payload = {
				method: "chat",
				data: {
					userId: currentUserId,
					sender: username,
					message,
				},
			};
		}
		socket.send(
			JSON.stringify(payload)
		);
		message = "";
		scrollToBottom();
	};

	onMount(() => {
		scrollToBottom();

		username = getUsername();

		if (username === "") {
			inputPlaceholder = "お名前を入力してください";
		}
		// Socket stuff
		socket = new WebSocket("ws://localhost:8082");

		socket.onopen = () => {
			console.log("Socket connected");
		};

		socket.onerror = (error) => {
			console.error("Can not connect to socket", error);
			messages = [
				...messages,
				{ userId: "0", sender: "管理人", message: "サーバーに接続できません。" },
			];
			inputDisabled = true;
		};

		socket.onmessage = (event) => {
			if (!event.data) {
				return;
			}
			const payload = JSON.parse(event.data);
			console.log(payload);
			if (payload["method"] === "update") {
				messages = payload["data"];
				scrollToBottom();
			}
		};

		// Get the input field
		var input = document.querySelector(".input-field");

		// Execute a function when the user releases a key on the keyboard
		input.addEventListener("keydown", function (event: KeyboardEvent) {
			// Number 13 is the "Enter" key on the keyboard
			if (event.key === "Enter") {
				// Cancel the default action, if needed
				event.preventDefault();
				// Trigger the button element with a click
			}
		});
	});
</script>

<main>
	<div class="main">
		<div class="input-section vertical-text">
			<InputField
				bind:message
				bind:disabled={inputDisabled}
				bind:placeholder={inputPlaceholder}
				on:submit={handleSubmit}
				bind:this={inputField}
			/>
		</div>
		<div
			class="board vertical-text"
			bind:this={board}
			style="scroll-behavior: {scrollMode}"
		>
			<div class="spacer" />
			{#each messages as { userId, sender, message: text }}
				<Message {currentUserId} {sender} {userId} {text} />
			{/each}
		</div>
	</div>
</main>

<style>
	main {
		background: #f1ebe8;
	}

	.vertical-text {
		-webkit-writing-mode: vertical-rl;
		-ms-writing-mode: tb-rl;
		writing-mode: vertical-rl;
		text-orientation: upright;
		font-size: 20px;
		font-family: "Noto Serif JP", serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		-webkit-font-feature-settings: "palt";
		font-feature-settings: "palt";
		color: #2c3e50;
		line-height: 2em;
		text-indent: 0em;
	}

	.main {
		display: flex;
		padding: 16px 16px;
		height: 95vh;
	}

	.board {
		flex: 1;
		overflow-x: scroll;
		display: flex;
		flex-direction: column;
	}

	.board > .spacer {
		margin-right: auto;
	}

	.input-section {
		height: 95vh;
		display: flex;
		margin-right: 10px;
		align-items: flex-end;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
