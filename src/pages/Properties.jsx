import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function Properties({ token }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    bedrooms: "",
    bathrooms: "",
    price: "",
    type: "residential",
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/properties`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProperties(response.data);
      setError("");
    } catch (err) {
      setError("Failed to load properties");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API_URL}/properties`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchProperties();
      setShowModal(false);
      setFormData({
        address: "",
        bedrooms: "",
        bathrooms: "",
        price: "",
        type: "residential",
      });
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add property");
    }
  };

  if (loading) {
    return <div className="loading">Loading properties...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>My Properties</h2>
        <button
          className="btn btn-primary btn-small"
          onClick={() => setShowModal(true)}
        >
          + Add New Property
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="leads-container">
        <div className="leads-header">
          <h3>Property Listings</h3>
        </div>

        {properties.length === 0 ? (
          <div className="empty-state">
            <h3>No properties yet</h3>
            <p>Click "Add New Property" to get started</p>
          </div>
        ) : (
          <table className="leads-table">
            <thead>
              <tr>
                <th>Address</th>
                <th>Type</th>
                <th>Bedrooms</th>
                <th>Bathrooms</th>
                <th>Price</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id}>
                  <td>
                    <strong>{property.address}</strong>
                  </td>
                  <td>{property.type || "-"}</td>
                  <td>{property.bedrooms || "-"}</td>
                  <td>{property.bathrooms || "-"}</td>
                  <td>
                    KES{" "}
                    {property.price
                      ? parseFloat(property.price).toLocaleString()
                      : "-"}
                  </td>
                  <td>{new Date(property.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={`modal ${showModal ? "" : "hidden"}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h2>Add New Property</h2>
            <button className="close-btn" onClick={() => setShowModal(false)}>
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Address *</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                placeholder="e.g., 123 Main Street, Nairobi"
              />
            </div>

            <div className="form-group">
              <label>Property Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="land">Land</option>
                <option value="office">Office</option>
              </select>
            </div>

            <div className="form-group">
              <label>Bedrooms</label>
              <input
                type="number"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleInputChange}
                placeholder="e.g., 2"
              />
            </div>

            <div className="form-group">
              <label>Bathrooms</label>
              <input
                type="number"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleInputChange}
                placeholder="e.g., 1"
              />
            </div>

            <div className="form-group">
              <label>Price (KES)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="e.g., 5000000"
              />
            </div>

            <button type="submit" className="btn">
              Add Property
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Properties;
