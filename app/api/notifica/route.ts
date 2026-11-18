import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

type Payload = {
  nome: string;
  email: string;
  telefono: string;
  marca: string;
  modello: string;
  indirizzo: string;
  servizio: string;
  categoria: string;
  extra: string[];
  durataMin: number;
  prezzo: string;
  dataOra: string;
  note: string;
  foto: number;
};

function line(label: string, value: string) {
  return `${label}: ${value || "-"}`;
}

export async function POST(req: Request) {
  let p: Payload;
  try {
    p = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!p?.email || !p?.nome) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const ownerPhone = process.env.OWNER_WHATSAPP;
  const callmebotKey = process.env.CALLMEBOT_APIKEY;

  const riepilogo = [
    line("Servizio", p.servizio),
    line("Categoria auto", p.categoria),
    line("Extra", p.extra.length ? p.extra.join(", ") : "nessuno"),
    line("Durata stimata", `${p.durataMin} min`),
    line("Prezzo indicativo", p.prezzo),
    line("Data e ora", p.dataOra),
    line("Indirizzo", p.indirizzo),
    line("Auto", `${p.marca} ${p.modello}`),
    line("Nome", p.nome),
    line("Telefono", p.telefono),
    line("Email", p.email),
    line("Note", p.note),
    line("Foto caricate", String(p.foto)),
  ].join("\n");

  const warnings: string[] = [];

  // Email di riepilogo al cliente, con copia nascosta alla tua Gmail
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPass },
      });
      await transporter.sendMail({
        from: `DCC Deep Car Care <${gmailUser}>`,
        to: p.email,
        bcc: gmailUser,
        subject: "Richiesta ricevuta - DCC Deep Car Care",
        text: `Ciao ${p.nome},\n\nabbiamo ricevuto la tua richiesta. Ecco il riepilogo:\n\n${riepilogo}\n\nIl nostro team ti contatterà al più presto via WhatsApp, email o telefono per confermare l'appuntamento e il prezzo definitivo.\n\nDCC Deep Car Care`,
      });
    } catch {
      warnings.push("email");
    }
  } else {
    warnings.push("email-config");
  }

  // WhatsApp di notifica a te (CallMeBot)
  if (ownerPhone && callmebotKey) {
    try {
      const text = encodeURIComponent(
        `Nuova richiesta da ${p.nome} (${p.telefono})\n${riepilogo}`
      );
      const res = await fetch(
        `https://api.callmebot.com/whatsapp.php?phone=${ownerPhone}&text=${text}&apikey=${callmebotKey}`
      );
      if (!res.ok) warnings.push("whatsapp");
    } catch {
      warnings.push("whatsapp");
    }
  } else {
    warnings.push("whatsapp-config");
  }

  return NextResponse.json({ ok: true, warnings });
}