import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function LeadDetail({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchLead();
  }, [id]);

  const fetchLead = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/leads/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLead(response.data);
      setFormData(response.data);
      setError("");
    } catch (err) {
      setError("Failed to load lead");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const response = await axios.put(`${API_URL}/leads/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLead(response.data);
      setEditing(false);
      setError("");
    } catch (err) {
      setError("Failed to save lead");
    }
  };

  const handleSendReminder = async () => {
    try {
      await axios.post(
        `${API_URL}/leads/${id}/send-reminder`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      alert("SMS reminder sent successfully!");
    } catch (err) {
      setError("Failed to send reminder");
    }
  };

  if (loading) return <div className="loading">Loading lead details...</div>;

  if (!lead) return <div className="error-message">Lead not found</div>;

  const getStatusClass = (status) => `status-badge status-${status}`;

  return (
    <div className="lead-detail">
      <button
        className="btn btn-secondary btn-small"
        onClick={() => navigate("/")}
      >
        ← Back to Leads
      </button>

      {error && <div className="error-message">{error}</div>}

      <h2>{lead.client_name}</h2>

      {!editing ? (
        <>
          <div className="lead-info">
            <div className="lead-info-row">
              <span className="lead-info-label">Phone:</span>
              <span className="lead-info-value">{lead.client_phone}</span>
            </div>
            <div className="lead-info-row">
              <span className="lead-info-label">Property Interest:</span>
              <span className="lead-info-value">
                {lead.property_interest || "-"}
              </span>
            </div>
            <div className="lead-info-row">
              <span className="lead-info-label">Status:</span>
              <span className={getStatusClass(lead.status)}>{lead.status}</span>
            </div>
            <div className="lead-info-row">
              <span className="lead-info-label">Follow-up Date:</span>
              <span className="lead-info-value">
                {lead.follow_up_date
                  ? new Date(lead.follow_up_date).toLocaleDateString()
                  : "-"}
              </span>
            </div>
            <div className="lead-info-row">
              <span className="lead-info-label">Added:</span>
              <span className="lead-info-value">
                {new Date(lead.created_at).toLocaleDateString()}
              </span>
            </div>
            {lead.notes && (
              <div className="lead-info-row">
                <span className="lead-info-label">Notes:</span>
                <span className="lead-info-value">{lead.notes}</span>
              </div>
            )}
          </div>

          <div className="lead-actions">
            <button
              className="btn btn-primary"
              onClick={() => setEditing(true)}
            >
              Edit Lead
            </button>
            <button className="btn btn-success" onClick={handleSendReminder}>
              Send SMS Reminder
            </button>
          </div>
        </>
      ) : (
        <>
          <form>
            <div className="form-group">
              <label>Client Name</label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="client_phone"
                value={formData.client_phone}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Property Interest</label>
              <input
                type="text"
                name="property_interest"
                value={formData.property_interest}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="interested">Interested</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="form-group">
              <label>Follow-up Date</label>
              <input
                type="date"
                name="follow_up_date"
                value={formData.follow_up_date?.split("T")[0] || ""}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="4"
              />
            </div>

            <div className="lead-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
              >
                Save Changes
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditing(false);
                  setFormData(lead);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default LeadDetail;
