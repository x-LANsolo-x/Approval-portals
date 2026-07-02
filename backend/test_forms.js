fetch('http://localhost:5005/api/approval-forms')
    .then(r=>r.json())
    .then(d => {
        d.forms.forEach(f => {
            console.log("Event:", f['Event Name'] || Object.values(f)[6]);
        });
    })
    .catch(console.error);
