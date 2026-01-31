import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AppContext from "../Context/Context";
import unplugged from "../assets/unplugged.png"

const Home = ({ selectedCategory }) => {
  const { data, isError, addToCart, refreshData } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [isDataFetched, setIsDataFetched] = useState(false);

  useEffect(() => {
    if (!isDataFetched) {
      refreshData();
      setIsDataFetched(true);
    }
  }, [refreshData, isDataFetched]);

  useEffect(() => {
    if (data && data.length > 0) {
      const fetchImagesAndUpdateProducts = async () => {
        const updatedProducts = await Promise.all(
          data.map(async (product) => {
            try {
              const response = await axios.get(
                `http://localhost:8080/api/product/${product.id}/image`,
                { responseType: "blob" }
              );
              const imageUrl = URL.createObjectURL(response.data);
              return { ...product, imageUrl };
            } catch (error) {
              console.error(
                "Error fetching image for product ID:",
                product.id,
                error
              );
              return { ...product, imageUrl: "placeholder-image-url" };
            }
          })
        );
        setProducts(updatedProducts);
      };

      fetchImagesAndUpdateProducts();
    }
  }, [data]);

  const filteredProducts = selectedCategory
    ? products.filter((product) => product.category === selectedCategory)
    : products;

  if (isError) {
    return (
      <h2>
        <img src={unplugged} alt="Error" />
      </h2>
    );
  }
  
  return (
    <>
      <div className="product-grid">
        {filteredProducts.length === 0 ? (
          <h2 className="no-products">No Products Available</h2>
        ) : (
          filteredProducts.map((product) => {
            const { id, brand, name, price, productAvailable, imageUrl } =
              product;
            return (
              <div key={id} className="product-card">
                <Link to={`/product/${id}`}>
                  <img src={imageUrl} alt={name} />
                  <div className="product-card-info">
                    <h5>{name.toUpperCase()}</h5>
                    <i>{"~ " + brand}</i>
                  </div>
                  <div className="product-card-footer">
                    <p>${price}</p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        addToCart(product);
                      }}
                      disabled={!productAvailable}
                    >
                      {productAvailable ? "Add to Cart" : "Out of Stock"}
                    </button>
                  </div>
                </Link>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};
const Section = ({ title, subtitle, products }) => {
  if (!products?.length) return null;

  return (
    <section style={{ marginBottom: "2.5rem" }}>
      <div className="section-header">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>

      <div className="product-grid">
        {products.map((p) => (
          <div className="product-card" key={p.id}>
            {/* your existing card UI */}
            <img src={p.imageUrl} alt={p.name} />
            <div className="product-info">
              <h3>{p.name}</h3>
              <p className="brand">{p.brand}</p>
            </div>
            <div className="product-footer">
              <span className="price">₹{p.price}</span>
              <button className="add-to-cart-btn">Add to Cart</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default function Home({ products }) {
  const kashmiriSpecial = products.filter((p) => p.category === "Kashmiri Special");
  const newArrivals = products.filter((p) => p.isNewArrival === true);

  return (
    <div className="home-page">
      <Section
        title="Kashmiri Special 🏔️"
        subtitle="Premium dry fruits & authentic items"
        products={kashmiriSpecial}
      />

      <Section
        title="New Arrivals ✨"
        subtitle="Freshly added products"
        products={newArrivals}
      />
    </div>
  );
}

// export default Home;