<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let message;
  export let placeholder;
  export let disabled = false;

  const dispatch = createEventDispatcher();

  const handleSubmit = () => {
    dispatch("submit");
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      dispatch("submit");
    }
  };
</script>

<div
  class="input-field"
  contenteditable="true"
  placeholder={placeholder}
  bind:textContent={message}
  on:keydown={handleKeyDown}
>
  テスト
</div>
<div>
  <button class="send" on:click={handleSubmit} {disabled}>送<br />信</button>
</div>

<style>
  div {
    margin: 5px 0px;
  }
  .input-field {
    padding: 10px 0px;
    outline: auto;
    flex: 1;
  }

  .send {
    background-color: #685d5e;
    color: white;
    font-size: 20px;
    border-radius: 5px;
    border: 0px;
    padding: 5px 10px;
    flex: 0 0;
  }

  [contenteditable="true"]:empty:before {
    content: attr(placeholder);
    pointer-events: none;
    display: block;
    /* For Firefox */
  }

  .send:enabled {
    cursor: pointer;
  }

  .send:disabled {
    opacity: 0.2;
  }
</style>
