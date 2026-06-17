export default function AdminLoading() {
  return (
    <div style={{ padding: "32px 24px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ height: "32px", width: "200px", background: "#e0e0e0", marginBottom: "24px" }} />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{ height: "72px", background: "#e0e0e0", marginBottom: "3px", opacity: 1 - i * 0.2 }}
        />
      ))}
    </div>
  );
}
