import { apiFetch } from "@/lib/api";
import type { User } from "@/types";
import { updateUser } from "../../actions";
import UserForm from "../../UserForm";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await apiFetch<User>(`/api/users/${id}`, {}, true).catch(() => null);

  if (!user) {
    return <p style={{ color: "#c00" }}>Usuário não encontrado.</p>;
  }

  const action = async (formData: FormData) => {
    "use server";
    await updateUser(user.id, formData);
  };

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "1px", marginBottom: "32px" }}>
        Editar usuário
      </h1>
      <UserForm action={action} defaultValues={{ email: user.email, roles: user.roles }} isEdit />
    </div>
  );
}