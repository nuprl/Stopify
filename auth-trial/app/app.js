import React from 'react'; 
import ReactDOM from 'react-dom'; 

class UghWorld extends React.Component {
	render() {
		return (
			<p>ugh, world</p>
			);
	}
}

ReactDOM.render(
<UghWorld />,
document.getElementById('editor')
);