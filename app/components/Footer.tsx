import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="foot-inner">
        <div className="meta">
          <b>{site.brand}</b>
          <br />
          {site.license}
        </div>
      </div>
    </footer>
  );
}
