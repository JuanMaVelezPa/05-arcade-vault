import { NextResponse } from "next/server";
import { Resend } from "resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARS = /\p{Cc}/u;
const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;

// Best-effort limit: per server instance, resets on restart, and
// x-forwarded-for can be spoofed or missing (shared "unknown" bucket)
const hits = new Map<string, number[]>(); // ip -> request timestamps (ms) in the window
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

function rateLimited(request: Request): boolean {
  const now = Date.now();
  for (const [key, times] of hits) {
    const recent = times.filter((t) => now - t < WINDOW_MS);
    if (recent.length) hits.set(key, recent);
    else hits.delete(key);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const times = hits.get(ip) ?? [];
  if (times.length >= MAX_REQUESTS) return true;
  hits.set(ip, [...times, now]);
  return false;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Inline styles only: email clients ignore <style> blocks and external assets
function contactHtml(name: string, email: string, message: string): string {
  const n = escapeHtml(name);
  const e = escapeHtml(email);
  const m = escapeHtml(message).replace(/\r?\n/g, "<br>");
  const label =
    "margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#ff2bd6;text-transform:uppercase;";
  const value = "margin:0 0 20px;font-size:16px;color:#e8f6ff;";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#05060f;font-family:'Courier New',monospace;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#0b0d1f;border:2px solid #00f0ff;">
      <tr>
        <td style="padding:20px 24px;border-bottom:2px solid #00f0ff;">
          <p style="margin:0;font-size:18px;font-weight:bold;letter-spacing:3px;color:#00f0ff;">ARCADE VAULT</p>
          <p style="margin:4px 0 0;font-size:12px;letter-spacing:2px;color:#8a93b8;">NEW CONTACT MESSAGE</p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <p style="${label}">Name</p>
          <p style="${value}">${n}</p>
          <p style="${label}">Email</p>
          <p style="${value}"><a href="mailto:${e}" style="color:#00f0ff;">${e}</a></p>
          <p style="${label}">Message</p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#e8f6ff;">${m}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 24px;border-top:1px solid #1d2142;font-size:11px;color:#8a93b8;">
          Reply to this email to answer ${n} directly.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

type ContactBody = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
};

export async function POST(request: Request) {
  if (rateLimited(request)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  let body: ContactBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 },
    );
  }

  if (
    name.length > MAX_NAME ||
    email.length > MAX_EMAIL ||
    message.length > MAX_MESSAGE
  ) {
    return NextResponse.json(
      { error: "Name, email, or message is too long." },
      { status: 400 },
    );
  }

  if (CONTROL_CHARS.test(name) || CONTROL_CHARS.test(email)) {
    return NextResponse.json(
      { error: "Name and email contain invalid characters." },
      { status: 400 },
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 },
    );
  }

  try {
    const to = process.env.CONTACT_TO_EMAIL;
    if (!to) {
      console.error("CONTACT_TO_EMAIL is not set");
      return NextResponse.json(
        { error: "Failed to send message. Please try again." },
        { status: 500 },
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY is not set");
      return NextResponse.json(
        { error: "Failed to send message. Please try again." },
        { status: 500 },
      );
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      to,
      from: "Arcade Vault <onboarding@resend.dev>",
      replyTo: email,
      subject: `New Arcade Vault contact message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: contactHtml(name, email, message),
    });

    if (error) {
      console.error("Resend error", error);
      return NextResponse.json(
        { error: "Failed to send message. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 },
    );
  }
}
