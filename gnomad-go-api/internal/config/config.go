// Package config handles application configuration management using Viper.
// It provides a centralized way to load and access configuration values
// from environment variables with sensible defaults.
package config

import (
	"github.com/spf13/viper"
)

type Config struct {
	Port             string
	ElasticsearchURL string
	RedisURL         string
	EnablePlayground bool
}

func Load() (*Config, error) {
	viper.SetDefault("PORT", "8010")
	viper.SetDefault("ELASTICSEARCH_URL", "http://localhost:9200")
	viper.SetDefault("REDIS_URL", "redis://localhost:6379")
	viper.SetDefault("ENABLE_PLAYGROUND", true)

	viper.AutomaticEnv()

	return &Config{
		Port:             viper.GetString("PORT"),
		ElasticsearchURL: viper.GetString("ELASTICSEARCH_URL"),
		RedisURL:         viper.GetString("REDIS_URL"),
		EnablePlayground: viper.GetBool("ENABLE_PLAYGROUND"),
	}, nil
}
