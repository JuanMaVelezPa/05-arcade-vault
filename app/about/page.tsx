"use client";

import { useEffect, useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function HighlightIcon({ kind }: { kind: string }) {
  const C = "currentColor";
  if (kind === "HEART")
    return (
      <svg className="hl-icon" viewBox="0 0 16 16">
        <g fill={C}>
          <rect x="2" y="3" width="4" height="2" />
          <rect x="10" y="3" width="4" height="2" />
          <rect x="1" y="4" width="2" height="4" />
          <rect x="13" y="4" width="2" height="4" />
          <rect x="2" y="8" width="2" height="2" />
          <rect x="12" y="8" width="2" height="2" />
          <rect x="3" y="9" width="10" height="2" />
          <rect x="4" y="11" width="8" height="2" />
          <rect x="5" y="12" width="6" height="2" />
          <rect x="6" y="13" width="4" height="1" />
          <rect x="7" y="14" width="2" height="1" />
        </g>
      </svg>
    );
  if (kind === "BROWSER")
    return (
      <svg className="hl-icon" viewBox="0 0 16 16">
        <g fill={C}>
          <rect x="1" y="2" width="14" height="12" fill="none" stroke={C} strokeWidth="1.4" />
          <rect x="1" y="2" width="14" height="3" />
          <rect x="3" y="3" width="1" height="1" fill="#0a0a0f" />
          <rect x="5" y="3" width="1" height="1" fill="#0a0a0f" />
          <rect x="7" y="3" width="1" height="1" fill="#0a0a0f" />
          <rect x="3" y="7" width="4" height="1" />
          <rect x="3" y="9" width="6" height="1" />
          <rect x="3" y="11" width="3" height="1" />
        </g>
      </svg>
    );
  if (kind === "PLANT")
    return (
      <svg className="hl-icon" viewBox="0 0 16 16">
        <g fill={C}>
          <rect x="7" y="2" width="2" height="10" />
          <rect x="4" y="4" width="3" height="2" />
          <rect x="9" y="6" width="3" height="2" />
          <rect x="3" y="3" width="2" height="2" />
          <rect x="11" y="5" width="2" height="2" />
          <rect x="3" y="12" width="10" height="2" />
          <rect x="4" y="14" width="8" height="1" />
        </g>
      </svg>
    );
  return null;
}

const HIGHLIGHTS = [
  { i: "HEART", t: "MADE WITH ❤️ FOR PLAYERS", c: "magenta" },
  { i: "BROWSER", t: "HTML GAMES — RUN IN ANY BROWSER", c: "cyan" },
  { i: "PLANT", t: "A CONSTANTLY GROWING PROJECT", c: "green" },
];

type FormState = { name: string; email: string; message: string };
type Status = "editing" | "submitting" | "success" | "error";

const EMPTY_FORM: FormState = { name: "", email: "", message: "" };

export default function About() {
  useReveal();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<Status>("editing");
  const [sentName, setSentName] = useState("");
  const [shake, setShake] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name || !email || !message || !EMAIL_REGEX.test(email)) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }

      const data = await res.json();
      if (!data.ok) {
        setStatus("error");
        return;
      }

      setSentName(name);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSentName("");
    setStatus("editing");
  };

  return (
    <div className="about fade-in">
      {/* ABOUT */}
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ABOUT</div>
        <h1 className="about-title">ABOUT ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT was born from a love of classic video games. Our mission is to preserve and celebrate the
          arcades that defined a generation, making them accessible to everyone, anywhere, at no cost.
        </p>

        <div className="highlight-row">
          {HIGHLIGHTS.map((h, i) => (
            <div key={i} className={"highlight " + h.c} style={{ transitionDelay: i * 80 + "ms" }}>
              <HighlightIcon kind={h.i} />
              <div className="hl-text pixel">{h.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* divider banner */}
      <div className="about-divider reveal" aria-hidden="true">
        <div className="div-bar"></div>
        <div className="div-pixels">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} style={{ animationDelay: i * 80 + "ms" }}></span>
          ))}
        </div>
        <div className="div-bar"></div>
      </div>

      {/* CONTACT */}
      <section className="about-contact reveal">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACT</div>
            <h2 className="contact-title">GET IN TOUCH</h2>
            <p className="contact-sub">
              Have a suggestion, want to propose a game, or just want to say hi? Write to us.
            </p>
            <div className="contact-tips">
              <div className="tip">
                <span className="tip-led"></span>REPLY WITHIN 24-48H
              </div>
              <div className="tip">
                <span className="tip-led y"></span>SUGGESTIONS WELCOME
              </div>
              <div className="tip">
                <span className="tip-led m"></span>NO SPAM, EVER
              </div>
            </div>
          </div>

          <form className={"contact-form" + (shake ? " shake" : "")} onSubmit={onSubmit}>
            {status === "editing" || status === "submitting" ? (
              <>
                <div className="field">
                  <label>NAME</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="px_kai"
                    disabled={status === "submitting"}
                  />
                </div>
                <div className="field">
                  <label>EMAIL</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="player@vault.gg"
                    disabled={status === "submitting"}
                  />
                </div>
                <div className="field">
                  <label>MESSAGE</label>
                  <textarea
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us what's on your mind…"
                    disabled={status === "submitting"}
                  ></textarea>
                </div>
                <button className="btn xl press" type="submit" style={{ width: "100%" }} disabled={status === "submitting"}>
                  {status === "submitting" ? "▶  SENDING…" : "▶  SEND MESSAGE"}
                </button>
              </>
            ) : status === "success" ? (
              <div className="terminal-success">
                <div className="term-bar">
                  <span className="dot r"></span>
                  <span className="dot y"></span>
                  <span className="dot g"></span>
                  <span className="term-title">VAULT-OS // TERMINAL</span>
                </div>
                <div className="term-body">
                  <div className="line">
                    <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
                  </div>
                  <div className="line dim">[OK] Connecting to server…</div>
                  <div className="line dim">[OK] Validating content…</div>
                  <div className="line dim">[OK] Transmitting packet…</div>
                  <div className="line success">
                    &gt; MESSAGE RECEIVED. WE&apos;LL GET BACK TO YOU SOON. THANKS, {sentName.toUpperCase()}.
                    <span className="caret">_</span>
                  </div>
                  <div style={{ marginTop: 18 }}>
                    <button className="btn ghost" type="button" onClick={resetForm}>
                      SEND ANOTHER MESSAGE
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="terminal-error">
                <div className="term-bar">
                  <span className="dot r"></span>
                  <span className="dot y"></span>
                  <span className="dot g"></span>
                  <span className="term-title">VAULT-OS // TERMINAL</span>
                </div>
                <div className="term-body">
                  <div className="line">
                    <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
                  </div>
                  <div className="line dim">[OK] Connecting to server…</div>
                  <div className="line dim">[FAIL] Transmission failed…</div>
                  <div className="error">
                    &gt; MESSAGE NOT SENT. SOMETHING WENT WRONG.<span className="caret">_</span>
                  </div>
                  <div style={{ marginTop: 18 }}>
                    <button className="btn ghost" type="button" onClick={() => setStatus("editing")}>
                      TRY AGAIN
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
