import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>🌳 Treeify</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Visualize your Prismic repository&rsquo;s Content Relationship hierarchy.
      </p>
      <p>
        <Link href="/repo-tree">→ Open the Repo Tree dashboard</Link>
      </p>
    </main>
  );
}
