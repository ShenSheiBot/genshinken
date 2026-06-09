import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="foot-inner">
        <div className="big">
          {site.brandCN}
          <span className="dots">.</span>
        </div>
        <div className="meta">
          <b>{site.brand}</b>
          <br />
          {site.license}
        </div>
      </div>
    </footer>
  );
}
