import FileUpload from "@/components/upload/FileUpload";
import DocumentHistory from "@/components/history/DocumentHistory";


export default function Home() {
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📄 Legal Doc AI - Upload</h1>
      <FileUpload />
      <DocumentHistory />
    </main>
  );
}
