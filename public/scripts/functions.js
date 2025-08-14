function searchFunction(event) {
  const button = event.currentTarget;
  const data = JSON.parse(button.getAttribute('data-books'));
  var sortedData = data;
  // console.log(data);
  const searchInput = document.getElementById("searchInput").value;
  const filterParams = document.getElementById("filterParams").value;

  if (searchInput) {

  }

  if (filterParams) {
    const userInputs = filterParams.split(' ');
    const filter = userInputs[0]; // rating or date_finished
    const order = userInputs[1]; // DESC or ASC
    if (filter === 'rating' && order === 'DESC') {
      sortedData = data.sort((a, b) => b.rating - a.rating);
    } else if (filter === 'rating' && order === 'ASC') {
      sortedData = data.sort((a, b) => a.rating - b.rating);
    } else if (filter === 'date_finished' && order === 'DESC') {
      console.log('3')
      sortedData = data.sort((a, b) => b.date_finished - a.date_finished);
    } else if (filter === 'date_finished' && order === 'ASC') {
      console.log('4')
      sortedData = data.sort((a, b) => a.date_finished - b.date_finished);
    } else {

    }


    console.log(sortedData)

  }
}
