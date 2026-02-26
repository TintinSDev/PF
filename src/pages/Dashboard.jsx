import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function Dashboard({ token, agent }) {
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    client_name: "",
    client_phone: "",
    property_interest: "",
    property_id: null,
    status: "new",
    follow_up_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchLeads();
    fetchProperties();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/leads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(response.data);
      setError("");
    } catch (err) {
      setError("Failed to load leads");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${API_URL}/properties`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProperties(response.data);
    } catch (err) {
      console.error("Failed to load properties:", err);
    }
  };

  const handleOpenModal = (lead = null) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        client_name: lead.client_name,
        client_phone: lead.client_phone,
        property_interest: lead.property_interest,
        property_id: lead.property_id || null,
        status: lead.status,
        follow_up_date: lead.follow_up_date?.split("T")[0] || "",
        notes: lead.notes || "",
      });
    } else {
      setEditingLead(null);
      setFormData({
        client_name: "",
        client_phone: "",
        property_interest: "",
        property_id: null,
        status: "new",
        follow_up_date: "",
        notes: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLead(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingLead) {
        await axios.put(`${API_URL}/leads/${editingLead.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_URL}/leads`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      fetchLeads();
      fetchProperties();
      handleCloseModal();
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save lead");
    }
  };

  const handleDelete = async (leadId) => {
    if (window.confirm("Are you sure you want to delete this lead?")) {
      try {
        await axios.delete(`${API_URL}/leads/${leadId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchLeads();
        fetchProperties();
      } catch (err) {
        setError("Failed to delete lead");
      }
    }
  };

  const handleSendReminder = async (leadId) => {
    try {
      await axios.post(
        `${API_URL}/leads/${leadId}/send-reminder`,
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

  const statusCounts = {
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    interested: leads.filter((l) => l.status === "interested").length,
    closed: leads.filter((l) => l.status === "closed").length,
  };

  const getStatusClass = (status) => `status-badge status-${status}`;

  if (loading) {
    return <div className="loading">Loading your leads...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>My Leads</h2>
        <button
          className="btn btn-primary btn-small"
          onClick={() => handleOpenModal()}
        >
          + Add New Lead
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Leads</h3>
          <div className="stat-number">{leads.length}</div>
        </div>
        <div className="stat-card">
          <h3>New Leads</h3>
          <div className="stat-number">{statusCounts.new}</div>
        </div>
        <div className="stat-card">
          <h3>Contacted</h3>
          <div className="stat-number">{statusCounts.contacted}</div>
        </div>
        <div className="stat-card">
          <h3>Interested</h3>
          <div className="stat-number">{statusCounts.interested}</div>
        </div>
        <div className="stat-card">
          <h3>Closed</h3>
          <div className="stat-number">{statusCounts.closed}</div>
        </div>
      </div>

      <div className="leads-container">
        <div className="leads-header">
          <h3>All Leads</h3>
        </div>

        {leads.length === 0 ? (
          <div className="empty-state">
            <h3>No leads yet</h3>
            <p>Click "Add New Lead" to get started</p>
          </div>
        ) : (
          <table className="leads-table">
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Phone</th>
                <th>Property Interest</th>
                <th>Status</th>
                <th>Follow-up Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.client_name}</strong>
                  </td>
                  <td>{lead.client_phone}</td>
                  <td>{lead.property_interest || "-"}</td>
                  <td>
                    <span className={getStatusClass(lead.status)}>
                      {lead.status}
                    </span>
                  </td>
                  <td>
                    {lead.follow_up_date
                      ? new Date(lead.follow_up_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      View
                    </button>
                    <button
                      className="btn btn-success btn-small"
                      onClick={() => handleSendReminder(lead.id)}
                      title="Send SMS Reminder"
                    >
                      SMS
                    </button>
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => handleOpenModal(lead)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDelete(lead.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={`modal ${showModal ? "" : "hidden"}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h2>{editingLead ? "Edit Lead" : "Add New Lead"}</h2>
            <button className="close-btn" onClick={handleCloseModal}>
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Client Name *</label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleInputChange}
                required
                placeholder="John Doe"
              />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                name="client_phone"
                value={formData.client_phone}
                onChange={handleInputChange}
                required
                placeholder="+254 7XX XXX XXX"
              />
            </div>

            <div className="form-group">
              <label>Property Interest</label>
              <input
                type="text"
                name="property_interest"
                value={formData.property_interest}
                onChange={handleInputChange}
                placeholder="e.g., 3 BR Apartment in Kilimani"
              />
            </div>

            <div className="form-group">
              <label>Select Property (Optional)</label>
              <select
                name="property_id"
                value={formData.property_id || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    property_id: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
              >
                <option value="">-- Select a property --</option>
                {properties.length === 0 ? (
                  <option disabled>
                    No properties available. Add one first.
                  </option>
                ) : (
                  properties.map((prop) => (
                    <option
                      key={prop.id}
                      value={prop.id}
                      disabled={prop.status !== "available"}
                    >
                      {prop.address} ({prop.bedrooms}BR) -{" "}
                      {prop.status === "available" ? "Available" : "Booked"}
                    </option>
                  ))
                )}
              </select>
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
                value={formData.follow_up_date}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add any relevant notes..."
                rows="4"
              />
            </div>

            <button type="submit" className="btn">
              {editingLead ? "Update Lead" : "Add Lead"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
