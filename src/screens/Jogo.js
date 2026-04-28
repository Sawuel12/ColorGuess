import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Alert, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../service/api'; // Importando a configuração do Axios
import { genresMap } from '../utils/genres';
import axios from 'axios';

const Jogo = () => {
  const [userInput, setUserInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  
  // Estados para guardar os dados
  const [movie, setMovie] = useState(null);
  const [colors, setColors] = useState([]);
  const [castName, setCastName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNewMovie();
  }, []);

  const loadNewMovie = async () => {
    setLoading(true);
    setAttempts(0);
    setUserInput('');

    try {
      //Busca filmes populares e escolhe um
      const response = await api.get('/movie/popular');
      const movies = response.data.results;
      const randomMovie = movies[Math.floor(Math.random() * movies.length)];

      //Busca o ator principal
      const creditsResponse = await api.get(`/movie/${randomMovie.id}/credits`);
      const mainActor = creditsResponse.data.cast[0]?.name || 'Elenco não encontrado';

      //Monta a URL do poster
      const imageUrl = `https://image.tmdb.org/t/p/w500${randomMovie.poster_path}`;

      //Extrai as cores da imagem usando API
      const colorResponse = await axios.get(`https://api.imagga.com/v2/colors?image_url=${encodeURIComponent(imageUrl)}`, {
        headers: {
          'Authorization': process.env.EXPO_PUBLIC_IMAGGA_AUTH
        }
      });

      //Pega as 5 pricipais cores da imagem
      let extractedColors = colorResponse.data.result.colors.image_colors
        .slice(0, 5)
        .map(color => color.html_code);

      //Garante as 5 cores
      while(extractedColors.length < 5) {
         extractedColors.push('#cccccc');
      }

      //Salva os dados
      setMovie(randomMovie);
      setCastName(mainActor);
      setColors(extractedColors);

    } catch (error) {
      //Motivo do erro
      console.log("QUEM DEU ERRO:", error.config?.url);
      console.log("MOTIVO:", error.response?.data || error.message);
      
      Alert.alert("Erro", "Não foi possível carregar o filme. Verifique sua API Key.");
    } finally {
      setLoading(false);
    }
  };

  const normalizeText = (text) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  };

  const handleGuess = () => {
    if (!userInput.trim()) return;

    const guess = normalizeText(userInput);
    const correctTitle = normalizeText(movie.title);

    if (guess === correctTitle) {
      Alert.alert(
        "🎉 Acertou!", 
        `Você precisou de ${attempts} dicas!`,
        [{ text: "Próximo Filme", onPress: loadNewMovie }] // Carrega um novo filme ao acertar
      );
    } else {
      setAttempts(prev => prev + 1);
      setUserInput('');
      
      if (attempts >= 3) {
        Alert.alert(
          "Fim de jogo :(", 
          `O filme era: ${movie.title}`,
          [{ text: "Tentar Outro", onPress: loadNewMovie }]
        );
      }
    }
  };

  // Tela de Loading enquanto a API responde
  if (loading || !movie) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Processando paleta de cores...</Text>
      </View>
    );
  }

  const imageUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adivinhe o Filme</Text>

      <View style={styles.paletteContainer}>
        {colors.map((color, index) => (
          <View key={index} style={[styles.colorBox, { backgroundColor: color }]} />
        ))}
      </View>

      <View style={styles.hintsContainer}>
        
        {/* Erro 1: Ano e Gêneros */}
        {attempts >= 1 && (
          <Text style={styles.hintText}>
            Dica 1: Lançado em {movie.release_date.split('-')[0]} • {
              // Pega os 2 primeiros IDs de gênero, traduz e junta com vírgula
              movie.genre_ids
                .slice(0, 2)
                .map(id => genresMap[id])
                .join(', ')
            }
          </Text>
        )}

        {/* Erro 2: Ator */}
        {attempts >= 2 && (
          <Text style={styles.hintText}>
            Dica 2: Estrelando {castName}
          </Text>
        )}

        {/* Erro 3: Poster Blur */}
        {attempts >= 3 && (
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.posterBlur} 
            blurRadius={15} 
          />
        )}
      </View>

      <TextInput
        placeholder="Digite o nome do filme..."
        value={userInput}
        onChangeText={setUserInput}
        style={styles.input}
      />
      <Button title="Enviar" onPress={handleGuess} disabled={attempts > 3} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  paletteContainer: { flexDirection: 'row', marginBottom: 30 },
  colorBox: { width: 50, height: 50, marginHorizontal: 5, borderRadius: 8, elevation: 3 },
  hintsContainer: { height: 250, alignItems: 'center', justifyContent: 'flex-start', width: '100%', marginBottom: 20 },
  hintText: { fontSize: 16, marginBottom: 10, color: '#333' },
  posterBlur: { width: 120, height: 180, borderRadius: 10, marginTop: 10 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 15, marginBottom: 15, backgroundColor: '#fff' }
});

export default Jogo;