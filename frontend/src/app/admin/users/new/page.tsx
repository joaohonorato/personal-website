import { createUser } from "../actions";
import UserForm from "../UserForm";

export default function NewUserPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "1px", marginBottom: "32px" }}>
        Novo usuário
      </h1>
      <UserForm action={createUser} />
    </div>
  );
}