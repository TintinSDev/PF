import React, { useState, useEffect } from "react";
import axios from "axios";
import "../App.css";

function Properties({ token, agent }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [formData, setFormData] = useState({
    address: "",
    bedrooms: "",
    bathrooms: "",
    price: "",
    type: "residential",
  });

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${apiUrl}/properties`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProperties(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching properties:", error);
      setLoading(false);
    }
  };

  const handleOpenModal = (property = null) => {
    if (property) {
      setEditingProperty(property);
      setFormData({
        address: property.address,
        bedrooms: property.bedrooms || "",
        bathrooms: property.bathrooms || "",
        price: property.price || "",
        type: property.type || "residential",
      });
    } else {
      setEditingProperty(null);
      setFormData({
        address: "",
        bedrooms: "",
        bathrooms: "",
        price: "",
        type: "residential",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProperty(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
    try {
      if (editingProperty) {
        await axios.put(
          `${apiUrl}/properties/${editingProperty.id}`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } else {
        await axios.post(`${apiUrl}/properties`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setFormData({
        address: "",
        bedrooms: "",
        bathrooms: "",
        price: "",
        type: "residential",
      });
      setShowModal(false);
      setEditingProperty(null);
      fetchProperties();
    } catch (error) {
      console.error("Error adding property:", error);
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    if (window.confirm("Are you sure you want to delete this property?")) {
      try {
        await axios.delete(`${apiUrl}/properties/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchProperties();
      } catch (error) {
        console.error("Error deleting property:", error);
        alert("Failed to delete property. It may be assigned to a lead.");
      }
    }
  };

  const handleStatusChange = async (propertyId, newStatus) => {
    try {
      await axios.put(
        `${apiUrl}/properties/${propertyId}`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchProperties();
    } catch (error) {
      console.error("Error updating property status:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "#51cf66";
      case "booked":
        return "#ffa94d";
      case "sold":
        return "#FF0000";
      default:
        return "#999";
    }
  };

  if (loading) return <div className="loading">Loading properties...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Properties</h2>
        <button
          className="btn btn-primary-prop"
          onClick={() => handleOpenModal()}
        >
          Add Property
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="empty-state">
          <h3>No Properties Yet</h3>
          <p>Add your first property to get started</p>
        </div>
      ) : (
        <div className="properties-grid">
          {properties.map((prop) => (
            <div key={prop.id} className="property-card">
              <div className="property-header">
                <h3>{prop.address}</h3>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(prop.status) }}
                >
                  {prop.status === "available" && "Available"}
                  {prop.status === "booked" && "Booked"}
                  {prop.status === "sold" && "Sold"}
                </span>
              </div>

              <div className="property-details">
                <p>
                  <strong>Bedrooms:</strong> {prop.bedrooms}
                </p>
                <p>
                  <strong>Bathrooms:</strong> {prop.bathrooms}
                </p>
                <p>
                  <strong>Price:</strong> KES {prop.price?.toLocaleString()}
                </p>
                <p>
                  <strong>Type:</strong> {prop.type}
                </p>
              </div>

              {prop.assigned_to && (
                <div className="assigned-to">
                  <strong>Assigned to:</strong> {prop.assigned_to}
                </div>
              )}

              <div className="property-actions">
                <select
                  value={prop.status}
                  onChange={(e) => handleStatusChange(prop.id, e.target.value)}
                  className="status-select"
                >
                  <option value="available">Available</option>
                  <option value="booked">Booked</option>
                  <option value="sold">Sold</option>
                </select>
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => handleOpenModal(prop)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => handleDeleteProperty(prop.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingProperty ? "Edit Property" : "Add New Property"}</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleAddProperty}>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Bedrooms</label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Bathrooms</label>
                  <input
                    type="number"
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Price (KES)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="land">Land</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary">
                {editingProperty ? "Update Property" : "Add Property"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default Properties;
