function principal() {
  let msg = document.getElementById("msg") as HTMLParagraphElement;
  let cash = document.getElementById("cash") as HTMLParagraphElement;
  let items = document.querySelectorAll(".item") as NodeListOf<HTMLDivElement>;
  const purchasedProducts: string[] = JSON.parse(
    localStorage.getItem("purchasedProducts") || "[]"
  );
  let totalMoney: number = parseInt(
    localStorage.getItem("userMoney") || "6000"
  );
  const channel = new BroadcastChannel("commerce");

  items.forEach((item) => {
    item.addEventListener("click", () => {
      if (totalMoney > 0) {
        switch (item.id) {
          case "ladrillos":
            msg.textContent =
              "¿Te queres hacer una casa?, compra lo que te pedí, dale";
            break;
          case "html":
            msg.textContent = "No lo es";
            break;
          case "rabano":
            msg.textContent = "No es hora de comer.";
            break;
          case "next":
            if (purchasedProducts.find((product) => product === "next")) {
              msg.textContent = "Ya compraste este producto.";
              break;
            } else {
              totalMoney -= 2000;
              localStorage.setItem("userMoney", JSON.stringify(totalMoney));
              cash.textContent = `Dinero restante: $${totalMoney}`;
              msg.textContent = "-$2000";
              purchasedProducts.push("next");
              channel.postMessage({
                type: "money",
                money: totalMoney,
                product: 2,
                title: "next",
              });
            }
            break;
          case "tailwind":
            if (purchasedProducts.find((product) => product === "tailwind")) {
              msg.textContent = "Ya compraste este producto.";
            } else {
              totalMoney -= 2000;
              localStorage.setItem("userMoney", JSON.stringify(totalMoney));
              cash.textContent = `Dinero restante: $${totalMoney}`;
              msg.textContent = "-$2000";
              purchasedProducts.push("tailwind");
              channel.postMessage({
                type: "money",
                money: totalMoney,
                product: 0,
                title: "tailwind",
              });
            }
            break;
          case "coca":
            if (purchasedProducts.find((product) => product === "coca")) {
              msg.textContent = "Ya compraste este producto.";
              break;
            } else {
              totalMoney -= 2000;
              localStorage.setItem("userMoney", JSON.stringify(totalMoney));
              cash.textContent = `Dinero restante: $${totalMoney}`;
              msg.textContent = "-$2000";
              purchasedProducts.push("coca");
              channel.postMessage({
                type: "money",
                money: totalMoney,
                product: 1,
                title: "coca",
              });
            }
            break;
        }
        setTimeout(() => {
          msg.textContent = "";
        }, 2000);
      } else {
        msg.textContent = "No tenés plata.";
        setTimeout(() => {
          msg.textContent = "";
        }, 3000);
      }
      if (purchasedProducts.length === 3) {
        setTimeout(() => {
          msg.textContent = "Listo, ya tenes todo. Traemelos.";
        }, 4000);
        setTimeout(() => {
          window.close();
          msg.textContent = "";
          channel.postMessage({
            type: "interact",
            isInteract: false,
          });
          channel.postMessage({
            type: "mission",
            missionNumber: 2,
          });
        }, 6000);
      }
    });
  });
}

principal();
