fetch('http://localhost:5005/api/events?role=Professional%20Society')
    .then(r=>r.json())
    .then(d => {
        let cyber = d.events.find(e => e['Event Name'] === 'CyberShield – Ethical Hacking & Cybersecurity' || e['Event Name'] === 'CloudScape – Mastering Cloud Computing & DevOps');
        console.log("Event:", cyber['Event Name']);
        console.log("Status:", cyber['STATUS OF ACTIVITY/EVENT'] || cyber['STATUS'] || cyber['Status'] || cyber['status of activity/event']);
        console.log("All keys:", Object.keys(cyber));
    })
    .catch(console.error);
