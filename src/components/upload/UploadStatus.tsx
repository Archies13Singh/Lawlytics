interface Props {
  fileUrl: string | null;
  error: string | null;
}

export default function UploadStatus({ fileUrl, error }: Props) {
  if (error) {
    return <p className="text-red-600">❌ {error}</p>;
  }
  if (fileUrl) {
    return (
      <p className="text-green-600">
        ✅ Uploaded: <a href={fileUrl} target="_blank" rel="noreferrer">{fileUrl}</a>
      </p>
    );
  }
  return null;
}