const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")

let warnings = {}

const badWords = ["http", "https", "www", "t.me", "رابط"]

function isBad(text = "") {
    return badWords.some(w => text.includes(w))
}

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("auth")

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    })

    sock.ev.on("creds.update", saveCreds)

    // 🔥 مهم جداً: هنا QR الجديد
    sock.ev.on("connection.update", (update) => {
        const { connection, qr } = update

        if (qr) {
            console.log("SCAN THIS QR:", qr)
        }

        if (connection === "close") {
            console.log("Connection closed, restarting...")
            startBot()
        }

        if (connection === "open") {
            console.log("BOT CONNECTED SUCCESSFULLY")
        }
    })

    sock.ev.on("messages.upsert", async ({ messages }) => {

        const msg = messages[0]
        if (!msg.message) return

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text || ""

        const sender = msg.key.participant || msg.key.remoteJid
        const group = msg.key.remoteJid

        if (isBad(text)) {

            await sock.sendMessage(group, { delete: msg.key })

            warnings[sender] = (warnings[sender] || 0) + 1

            if (warnings[sender] === 1) {
                await sock.sendMessage(group, { text: "⚠️ تنبيه 1" })
            }

            if (warnings[sender] === 2) {
                await sock.sendMessage(group, { text: "⚠️ تنبيه 2" })
            }

            if (warnings[sender] >= 3) {
                await sock.groupParticipantsUpdate(group, [sender], "remove")
            }
        }
    })
}

startBot()
