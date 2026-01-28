import { useState } from 'react';
import './SearchBar.css';

export default function SearchBar({ onSearch, showEmployeeFilter }) {
    const [filters, setFilters] = useState({
        status: '',
        employeeId: '',
        startDate: '',
        endDate: ''
    });

    const handleChange = (e) => {
        const newFilters = {
            ...filters,
            [e.target.name]: e.target.value
        };
        setFilters(newFilters);

        // Remove empty filters
        const cleanFilters = Object.fromEntries(
            Object.entries(newFilters).filter(([_, value]) => value !== '')
        );
        onSearch(cleanFilters);
    };

    const handleReset = () => {
        setFilters({
            status: '',
            employeeId: '',
            startDate: '',
            endDate: ''
        });
        onSearch({});
    };

    return (
        <div className="search-bar">
            <div className="search-filters">
                <div className="filter-group">
                    <label className="filter-label">Status</label>
                    <select
                        name="status"
                        value={filters.status}
                        onChange={handleChange}
                        className="form-select filter-select"
                    >
                        <option value="">All</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Start Date</label>
                    <input
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleChange}
                        className="form-input filter-input"
                    />
                </div>

                <div className="filter-group">
                    <label className="filter-label">End Date</label>
                    <input
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleChange}
                        className="form-input filter-input"
                    />
                </div>

                {showEmployeeFilter && (
                    <div className="filter-group">
                        <label className="filter-label">Employee ID</label>
                        <input
                            type="text"
                            name="employeeId"
                            value={filters.employeeId}
                            onChange={handleChange}
                            placeholder="Filter by user ID"
                            className="form-input filter-input"
                        />
                    </div>
                )}

                <button
                    onClick={handleReset}
                    className="btn btn-secondary btn-sm reset-btn"
                >
                    Reset
                </button>
            </div>
        </div>
    );
}
