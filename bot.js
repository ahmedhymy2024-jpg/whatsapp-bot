const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const qrcode = require("qrcode-terminal")

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info")

  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true, // مهم جداً على Render
    browser: ["Render Bot", "Chrome", "1.0"]
  })

  // 🔵 الاتصال + QR
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "open") {
      console.log("✅ تم الاتصال بـ WhatsApp بنجاح!")
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode

      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut

      console.log("⚠️ انقطع الاتصال، إعادة تشغيل...")

      if (shouldReconnect) {
        setTimeout(() => startBot(), 3000)
      } else {
        console.log("❌ تم تسجيل خروج، امسح QR من جديد")
      }
    }
  })

  // حفظ الجلسة
  sock.ev.on("creds.update", saveCreds)

  // استقبال الرسائل
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text

    console.log("📩 رسالة:", text)

    if (text === "سلام") {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "وعليكم السلام 🤍"
      })
    }
  })
}

startBot()
