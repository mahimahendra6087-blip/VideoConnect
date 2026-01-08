import React from 'react';
import { v1 as uuid } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CreateRoom = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [roomId, setRoomId] = React.useState("");

    function create() {
        const id = uuid();
        navigate(`/room/${id}`);
    }

    function join() {
        if (!roomId) return;
        let id = roomId;
        if (id.includes("/room/")) {
            id = id.split("/room/")[1];
        }
        navigate(`/room/${id}`);
    }

    return (
        <div className="landing-page">
            <div className="landing-left">
                <h1 className="landing-title">Premium video meetings. Now free for everyone.</h1>
                <p className="landing-subtitle">
                    We re-engineered the service we built for secure business meetings, Google Meet, to make it free and available for all.
                </p>
                <div className="action-row">
                    <button className="btn-new-meeting" onClick={create}>
                        <i className="material-icons" style={{ marginRight: '8px' }}>video_call</i>
                        New meeting
                    </button>
                    <div className="input-code-wrapper">
                        <i className="material-icons" style={{ color: '#5f6368' }}>keyboard</i>
                        <input
                            className="input-code"
                            type="text"
                            placeholder="Enter a code or link"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                        />
                        {roomId && (
                            <button className="btn-link active" onClick={join}>Join</button>
                        )}
                    </div>
                </div>
                <div style={{ marginTop: '20px', borderTop: '1px solid #3c4043', paddingTop: '20px' }}>
                    <button onClick={logout} className="btn-link" style={{ fontSize: '0.9rem' }}>Logout</button>
                </div>
            </div>
            <div className="landing-right">
                {/* Placeholder for promotional carousel image */}
                <img
                    src="https://www.gstatic.com/meet/user_edu_get_a_link_light_90698cd7b4ca04d3005c962a3756c42d.svg"
                    alt="Get a link you can share"
                    className="promo-image"
                    style={{ maxHeight: '300px' }}
                />
            </div>
        </div>
    );
};

export default CreateRoom;
