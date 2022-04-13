<script lang="ts">
    export let currentUserId: string;
    export let userId: string;
    export let sender: string = "？";
    export let text: string;
</script>

<div class="message-container" class:mine={currentUserId === userId}>
    <div class="balloon">
        <div class="prefix">
            {sender}
        </div>
        <div class="text">「{text}」</div>
    </div>
</div>

<style>

    .message-container {
        display: flex;
        flex-direction: row;
        margin: 0px 3px;
    }

    .balloon {
        margin: 0px 4px;
        padding-bottom: 20px;
        border-radius: 10px;
        white-space: pre-wrap;
        word-break: break-word;
        display: flex;
    }

    .prefix,
    .text {
        margin: 0px;
        padding: 0px;
        letter-spacing: 2px;
        line-height: 1.5;
    }

    .text {
        flex: 1 1;
/*         padding-top: 30px;
        text-indent: -30px; */
    }
</style>
