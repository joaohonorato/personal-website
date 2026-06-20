const STACK = [
  {
    category: "Backend",
    items: ["Java", "Spring Boot", "Kotlin", "Micronaut", "Node.js"],
  },
  {
    category: "Cloud",
    items: ["AWS", "GCP", "Azure"],
  },
  {
    category: "Mensageria & Eventos",
    items: ["Kafka", "RabbitMQ", "AWS SQS/SNS", "GCP Pub/Sub"],
  },
  {
    category: "DevOps & Infra",
    items: ["Kubernetes", "Docker", "Jenkins", "CI/CD"],
  },
  {
    category: "Dados",
    items: ["PostgreSQL", "DynamoDB", "CosmosDB", "MongoDB", "BigQuery"],
  },
  {
    category: "Observabilidade",
    items: ["OpenTelemetry", "Distributed Tracing"],
  },
  {
    category: "Frontend",
    items: ["Next.js", "TypeScript", "Angular"],
  },
];

export default function AboutPage() {
  return (
    <div className="container">
      <div className="section-header" style={{ marginBottom: "32px" }}>
        <span className="section-label">Sobre</span>
        <div className="section-line" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "12px", alignItems: "start" }}>

        {/* Main text */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          <div style={{ background: "#111", padding: "28px 32px", color: "#F5F0E8" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: "#FFD700", marginBottom: "12px" }}>
              Quem sou
            </div>
            <p style={{ fontSize: "16px", lineHeight: "1.8", margin: 0 }}>
              Sou o João Gabriel. Engenheiro de Controle e Automação pela UFSC, mas encontrei meu lugar no desenvolvimento de software — hoje atuo como{" "}
              <strong style={{ color: "#FFD700" }}>Especialista Java na GFT Consultoria</strong>, aqui de Florianópolis, depois de uma década nessa área.
            </p>
          </div>

          <div style={{ background: "#fff", border: "2px solid #111", borderTop: "none", padding: "28px 32px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: "#888", marginBottom: "12px" }}>
              O caminho
            </div>
            <p style={{ fontSize: "15px", lineHeight: "1.85", color: "#333", margin: "0 0 20px" }}>
              Esse site também é um pouco sobre uma mudança que venho fazendo fora do código. Estou deixando de lado hábitos que não me serviam mais — parei de fumar, e comecei a correr de verdade, não só como exercício, mas como processo.
            </p>
            <p style={{ fontSize: "15px", lineHeight: "1.85", color: "#333", margin: "0 0 20px" }}>
              O objetivo nessa nova fase é completar um{" "}
              <span style={{ background: "#FFD700", padding: "1px 6px", fontWeight: 600 }}>sprint triathlon</span>{" "}
              ainda este ano. Ainda não sei exatamente onde essa estrada vai dar, mas gosto de documentar o caminho.
            </p>
            <p style={{ fontSize: "15px", lineHeight: "1.85", color: "#555", margin: 0, fontStyle: "italic" }}>
              Entre commits e quilômetros, é por aqui que eu ando.
            </p>
          </div>

          {/* Education & Certs */}
          <div style={{ background: "#F5F0E8", border: "2px solid #111", borderTop: "none", padding: "28px 32px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: "#888", marginBottom: "16px" }}>
              Formação
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { title: "MBA em Data Science & Analytics", place: "USP/Esalq", period: "2025 – em andamento" },
                { title: "Engenharia de Controle e Automação", place: "UFSC", period: "2011 – 2018" },
              ].map((edu) => (
                <div key={edu.title} style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>{edu.title}</div>
                    <div style={{ fontSize: "12px", color: "#555" }}>{edu.place}</div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#888", whiteSpace: "nowrap", marginTop: "2px" }}>{edu.period}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #11111220" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Certificações</div>
              {["AZ900 – Microsoft Azure Fundamentals", "IBM – Big Data Foundations"].map((cert) => (
                <div key={cert} style={{ fontSize: "12px", color: "#444", padding: "3px 0" }}>— {cert}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar — stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          <div style={{ background: "#111", padding: "14px 18px" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: "#FFD700" }}>
              Stack
            </span>
          </div>
          {STACK.map((group, i) => (
            <div
              key={group.category}
              style={{
                background: i % 2 === 0 ? "#fff" : "#F5F0E8",
                border: "2px solid #111",
                borderTop: "none",
                padding: "14px 18px",
              }}
            >
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
                {group.category}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {group.items.map((item) => (
                  <span
                    key={item}
                    style={{
                      fontSize: "11px",
                      background: "#111",
                      color: "#F5F0E8",
                      padding: "2px 8px",
                      letterSpacing: "0.3px",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}

          <div style={{ background: "#FFD700", border: "2px solid #111", borderTop: "none", padding: "14px 18px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
              Fora do código
            </div>
            {[
              { label: "Meta 2026", value: "Sprint Triathlon" },
              { label: "Corrida", value: "em processo" },
              { label: "Localização", value: "Florianópolis, SC" },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: "4px 0", borderBottom: "1px solid #11111120" }}>
                <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#111" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
