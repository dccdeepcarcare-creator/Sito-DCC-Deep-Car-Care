import { redirect } from "next/navigation";

export default function PrenotaRedirect() {
  redirect("/listino#prenota");
}