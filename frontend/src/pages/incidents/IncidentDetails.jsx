import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../api/axios";

const inputClass =
  "w-full rounded-lg border border-green-300 bg-white px-3 py-2.5 text-green-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200";

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".doc",
  ".docx",
  ".txt",
  ".csv",
  ".xlsx",
];

function IncidentDetails() {
  const { incidentId } = useParams();
  const navigate = useNavigate();

  const [incident, setIncident] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const fetchDetails = async () => {
    setLoading(true);

    try {
      const [incidentResponse, timelineResponse] =
        await Promise.all([
          API.get(`/incidents/${incidentId}`),
          API.get(`/incidents/${incidentId}/timeline`),
        ]);

      setIncident(incidentResponse.data);
      setTimeline(timelineResponse.data.timeline || []);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Unable to load incident details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!incidentId || !/^\d+$/.test(incidentId)) {
      toast.error("Invalid incident ID.");
      navigate("/incidents", { replace: true });
      return;
    }

    fetchDetails();
  }, [incidentId]);

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!file) {
      toast.error("Please select a file.");
      return;
    }

    const extension = `.${file.name.split(".").pop().toLowerCase()}`;

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      toast.error("This file type is not allowed.");
      return;
    }

    if (file.size === 0) {
      toast.error("The selected file is empty.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size cannot exceed 10 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);

    try {
      await API.post(
        `/incidents/${incidentId}/attachments`,
        formData
      );

      toast.success("Attachment uploaded successfully!");
      setFile(null);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Unable to upload attachment."
      );
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center bg-white">
        <p className="font-medium text-green-700">
          Loading incident details...
        </p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-8 text-center text-green-700">
        <p>Incident details are unavailable.</p>
        <button
          onClick={() => navigate("/incidents")}
          className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          Back to Incidents
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate("/incidents")}
          className="mb-5 rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
        >
          ← Back to Incidents
        </button>

        <section className="rounded-xl border border-green-200 p-5 sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">
                Incident #{incident.id}
              </p>
              <h1 className="mt-2 text-2xl font-bold text-green-800">
                {incident.title}
              </h1>
            </div>

            <span className="inline-flex w-fit rounded-full border border-green-300 px-3 py-1.5 text-sm font-medium text-green-800">
              {incident.status?.replaceAll("_", " ")}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-green-100 p-4">
              <p className="text-sm text-green-700">Priority</p>
              <p className="mt-1 font-semibold text-green-800">
                {incident.priority}
              </p>
            </div>

            <div className="rounded-lg border border-green-100 p-4">
              <p className="text-sm text-green-700">Category</p>
              <p className="mt-1 font-semibold text-green-800">
                {incident.category || "—"}
              </p>
            </div>

            <div className="rounded-lg border border-green-100 p-4">
              <p className="text-sm text-green-700">Affected Service</p>
              <p className="mt-1 font-semibold text-green-800">
                {incident.affected_service || "—"}
              </p>
            </div>

            <div className="rounded-lg border border-green-100 p-4">
              <p className="text-sm text-green-700">Team ID</p>
              <p className="mt-1 font-semibold text-green-800">
                {incident.team_id ?? "Not assigned"}
              </p>
            </div>

            <div className="rounded-lg border border-green-100 p-4">
              <p className="text-sm text-green-700">Reporter ID</p>
              <p className="mt-1 font-semibold text-green-800">
                {incident.reporter_id ?? "—"}
              </p>
            </div>

            <div className="rounded-lg border border-green-100 p-4">
              <p className="text-sm text-green-700">Created At</p>
              <p className="mt-1 font-semibold text-green-800">
                {incident.created_at
                  ? new Date(incident.created_at).toLocaleString()
                  : "—"}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="mb-2 font-semibold text-green-800">
              Description
            </h2>
            <p className="whitespace-pre-wrap rounded-lg border border-green-100 p-4 text-sm leading-6 text-green-800">
              {incident.description || "No description provided."}
            </p>
          </div>

          {incident.resolution_details && (
            <div className="mt-6">
              <h2 className="mb-2 font-semibold text-green-800">
                Resolution Details
              </h2>
              <p className="whitespace-pre-wrap rounded-lg border border-green-100 p-4 text-sm leading-6 text-green-800">
                {incident.resolution_details}
              </p>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-green-200 p-5 sm:p-7">
          <h2 className="text-xl font-bold text-green-800">
            Upload Attachment
          </h2>

          <p className="mt-2 text-sm text-green-700">
            Allowed: PDF, PNG, JPG, DOC, DOCX, TXT, CSV, XLSX. Maximum 10 MB.
          </p>

          <form onSubmit={handleUpload} className="mt-4 space-y-4">
            <input
              type="file"
              accept={ALLOWED_EXTENSIONS.join(",")}
              onChange={(event) =>
                setFile(event.target.files?.[0] || null)
              }
              className={inputClass}
            />

            {file && (
              <p className="text-sm text-green-700">
                Selected: {file.name} (
                {(file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}

            <button
              type="submit"
              disabled={uploading || !file}
              className="rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload File"}
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-xl border border-green-200 p-5 sm:p-7">
          <h2 className="text-xl font-bold text-green-800">
            Incident Timeline
          </h2>

          <p className="mt-1 text-sm text-green-700">
            Status changes and assignment history.
          </p>

          {timeline.length === 0 ? (
            <p className="mt-6 rounded-lg border border-green-100 p-5 text-center text-green-700">
              No timeline events available.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {timeline.map((item, index) => (
                <div
                  key={`${item.type}-${item.created_at}-${index}`}
                  className="rounded-lg border border-green-200 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <span className="inline-flex w-fit rounded-full border border-green-300 px-3 py-1 text-xs font-semibold text-green-800">
                      {item.type === "STATUS_CHANGE"
                        ? "Status Change"
                        : item.type === "ASSIGNMENT"
                          ? "Assignment"
                          : item.type}
                    </span>

                    <span className="text-xs text-green-700">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : "Date unavailable"}
                    </span>
                  </div>

                  {item.type === "STATUS_CHANGE" && (
                    <div className="mt-3">
                      <p className="font-semibold text-green-800">
                        {item.old_status || "Created"} →{" "}
                        {item.new_status}
                      </p>
                      {item.comment && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-green-700">
                          {item.comment}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-green-700">
                        Changed by user ID: {item.changed_by ?? "—"}
                      </p>
                    </div>
                  )}

                  {item.type === "ASSIGNMENT" && (
                    <div className="mt-3">
                      <p className="font-semibold text-green-800">
                        Assigned to user #{item.assigned_to}
                      </p>
                      <p className="mt-1 text-sm text-green-700">
                        Assigned by user #{item.assigned_by ?? "—"}
                      </p>
                      {item.reason && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-green-700">
                          Reason: {item.reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6">
          <button
            onClick={fetchDetails}
            className="rounded-lg border border-green-300 px-5 py-2.5 font-semibold text-green-700 hover:bg-green-50"
          >
            Refresh Details
          </button>
        </div>
      </div>
    </div>
  );
}

export default IncidentDetails;
