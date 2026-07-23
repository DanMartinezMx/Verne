import type { UpdateInfo } from "@verne/core";

interface UpdateBannerProps {
  info: UpdateInfo;
  onDownload: (url: string) => void;
  onDismiss: () => void;
}

/**
 * Aviso discreto y NO bloqueante de versión nueva (P2). Informa y ofrece
 * descargar a mano; nunca interrumpe la escritura ni descarga solo.
 */
export function UpdateBanner({ info, onDownload, onDismiss }: UpdateBannerProps) {
  return (
    <div className="update-banner" role="status">
      <span className="update-text">
        Hay una versión nueva: <strong>v{info.latestVersion}</strong>
        {info.name ? ` — ${info.name}` : ""}.
      </span>
      <span className="update-actions">
        <button type="button" className="update-download" onClick={() => onDownload(info.url)}>
          Descargar
        </button>
        <button type="button" className="linklike" onClick={onDismiss}>
          Ahora no
        </button>
      </span>
    </div>
  );
}
