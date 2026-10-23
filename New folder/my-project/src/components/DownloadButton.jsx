import { Download } from "lucide-react";

export default function DownloadButton({
  children = "Get Started Free",
  className = "primary-button",
  ...props
}) {
  return (
    <a
      {...props}
      href={`${import.meta.env.BASE_URL}Downloads/leetgit.zip`}
      className={className}
      download="leetgit.zip"
    >
      {children}
      <Download size={16} aria-hidden="true" />
    </a>
  );
}