import { ChevronDown, ChevronUp, Filter, RefreshCw, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import "../components/css/AllUsers.css";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
}

type SortField = keyof User;
type SortOrder = "asc" | "desc";

const AllUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/users");
      setUsers(response.data.data || []);
      setError(null);
    } catch (err) {
      setError("Failed to fetch users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      await axiosInstance.put("/users/toggle-status", {
        userId,
        status: newStatus,
      });

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, status: newStatus } : user
        )
      );
    } catch (err: any) {
      console.error(
        "Failed to toggle status:",
        err.response?.data || err.message
      );
      setError(
        err.response?.data?.message ||
          "Failed to update user status. Please try again."
      );
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field)
      return <ChevronUp className="all-users-sort-icon-inactive" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="all-users-sort-icon-active" />
    ) : (
      <ChevronDown className="all-users-sort-icon-active" />
    );
  };

  const filteredAndSortedUsers = users
    .filter((user) => {
      const search = searchTerm.toLowerCase();
      return (
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.phone.includes(search) ||
        user.role.toLowerCase().includes(search) ||
        user.status.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (sortField === "createdAt") {
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortOrder === "asc" ? -1 : 1;
      if (aStr > bStr) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const getStatusClass = (status: string) => {
    return `all-users-status-badge all-users-status-${status.toLowerCase()}`;
  };

  const getRoleClass = (role: string) => {
    return `all-users-role-badge all-users-role-${role.toLowerCase()}`;
  };

  if (loading) {
    return (
      <div className="all-users-container">
        <div className="all-users-loading-state">
          <div className="all-users-loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="all-users-container">
        <div className="all-users-error-state">
          <p>{error}</p>
          <button onClick={fetchUsers} className="all-users-retry-button">
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="all-users-container">
      <div className="all-users-header">
        <div className="all-users-header-title">
          <h1>All Users</h1>
          <span className="all-users-count">
            {filteredAndSortedUsers.length} users
          </span>
        </div>

        <div className="all-users-header-actions">
          <div className="all-users-search-container">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="all-users-search-input"
            />
            {searchTerm && (
              <X
                size={16}
                className="all-users-clear-search"
                onClick={clearSearch}
              />
            )}
          </div>

          <button onClick={fetchUsers} className="all-users-refresh-button">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="all-users-table-container">
        <table className="all-users-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("name")}>
                <div className="all-users-sortable-header">
                  <span>Name</span>
                  {getSortIcon("name")}
                </div>
              </th>
              <th onClick={() => handleSort("email")}>
                <div className="all-users-sortable-header">
                  <span>Email</span>
                  {getSortIcon("email")}
                </div>
              </th>
              <th onClick={() => handleSort("phone")}>
                <div className="all-users-sortable-header">
                  <span>Phone</span>
                  {getSortIcon("phone")}
                </div>
              </th>
              <th onClick={() => handleSort("role")}>
                <div className="all-users-sortable-header">
                  <span>Role</span>
                  {getSortIcon("role")}
                </div>
              </th>
              <th onClick={() => handleSort("status")}>
                <div className="all-users-sortable-header">
                  <span>Status</span>
                  {getSortIcon("status")}
                </div>
              </th>
              <th onClick={() => handleSort("createdAt")}>
                <div className="all-users-sortable-header">
                  <span>Created At</span>
                  {getSortIcon("createdAt")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="all-users-empty-state">
                  <Filter size={48} className="all-users-empty-icon" />
                  <h3>No users found</h3>
                  <p>Try adjusting your search or refresh the page</p>
                </td>
              </tr>
            ) : (
              filteredAndSortedUsers
                .filter((user) => user.role?.toLowerCase() !== "super admin")
                .map((user) => (
                  <tr key={user.id} className="all-users-row">
                    <td className="all-users-name">{user.name}</td>
                    <td className="all-users-email">{user.email}</td>
                    <td className="all-users-phone">{user.phone}</td>
                    <td className="all-users-role">
                      <span className={getRoleClass(user.role)}>
                        {user.role}
                      </span>
                    </td>
                    <td className="all-users-status">
                      <span className={getStatusClass(user.status)}>
                        {user.status}
                      </span>
                      <button
                        className="all-users-status-toggle-btn"
                        onClick={() => toggleUserStatus(user.id, user.status)}
                      >
                        {user.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>

                    <td className="all-users-date">
                      {new Date(user.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllUsers;
