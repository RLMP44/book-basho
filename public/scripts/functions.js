function searchFunction(event) {
  const button = event.currentTarget;
  const data = JSON.parse(button.getAttribute('data-books'));
  var sortedData = data;
  console.log(data);
  const searchInput = document.getElementById("searchInput").value;
  const filterParams = document.getElementById("filterParams").value;
}
