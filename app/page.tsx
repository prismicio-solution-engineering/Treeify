import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "96px 28px" }}>
      <h1
        style={{
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          margin: 0,
        }}
      >
        Treeify
      </h1>
      <p style={{ color: "var(--text-2)", margin: "8px 0 28px", fontSize: 14 }}>
        Visualize your Prismic repository&rsquo;s Content Relationship hierarchy.
      </p>
      <Link href="/repo-tree">Open the Repo Tree →</Link>
    </main>
  );
}
