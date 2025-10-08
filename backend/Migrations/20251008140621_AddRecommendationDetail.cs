using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddRecommendationDetail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Recommendation",
                table: "AIRecommendations",
                newName: "Recommendation_Timeslot");

            migrationBuilder.AddColumn<string>(
                name: "Recommendation_Date",
                table: "AIRecommendations",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Recommendation_ResourceName",
                table: "AIRecommendations",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Recommendation_Date",
                table: "AIRecommendations");

            migrationBuilder.DropColumn(
                name: "Recommendation_ResourceName",
                table: "AIRecommendations");

            migrationBuilder.RenameColumn(
                name: "Recommendation_Timeslot",
                table: "AIRecommendations",
                newName: "Recommendation");
        }
    }
}
